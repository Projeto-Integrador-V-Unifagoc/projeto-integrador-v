import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MatriculaError, MatriculaService } from "./MatriculaService";

const alunoId = "11111111-1111-4111-8111-111111111111";
const cursoId = "22222222-2222-4222-8222-222222222222";
const turmaDisciplinaId = "33333333-3333-4333-8333-333333333333";

function criar(overrides: Record<string, unknown> = {}) {
    const repository = {
        listarTurmasDisponiveis: async () => [],
        criar: async () => ({ id: "m", aluno_id: alunoId, turma_id: "t", turma_disciplina_id: turmaDisciplinaId, status: "ativa" }),
        listarTodas: async () => [],
        listarPorAluno: async () => [],
        buscarPorId: async () => null,
        cancelar: async () => null,
        consultarStatusPorMatricula: async () => null,
        atualizarStatus: async () => null,
        ...overrides,
    };
    return new MatriculaService(repository as any);
}

describe("MatriculaService", () => {
    it("lista ofertas pelo curso e exclui as que o aluno já cursa", async () => {
        let argumentos: unknown[] = [];
        const service = criar({ listarTurmasDisponiveis: async (...args: unknown[]) => { argumentos = args; return []; } });
        await service.listarTurmasDisponiveis(cursoId, alunoId);
        assert.deepEqual(argumentos, [cursoId, alunoId]);
    });

    it("rejeita identificadores inválidos antes de consultar o banco", async () => {
        await assert.rejects(criar().listarTurmasDisponiveis("curso"), (error: MatriculaError) => error.status === 400);
        await assert.rejects(criar().criarMatricula(alunoId, "turma"), (error: MatriculaError) => error.status === 400);
    });

    it("cria o vínculo usando o id de turma_disciplina", async () => {
        let argumentos: unknown[] = [];
        const service = criar({ criar: async (...args: unknown[]) => { argumentos = args; return { id: "m", aluno_id: alunoId, turma_id: "t", status: "ativa" }; } });
        await service.criarMatricula(alunoId, turmaDisciplinaId);
        assert.deepEqual(argumentos, [alunoId, turmaDisciplinaId]);
    });

    it("traduz duplicidade, indisponibilidade e ausência para o status HTTP correto", async () => {
        for (const [codigo, status] of [["DUPLICADA", 409], ["SEM_VAGAS", 409], ["NAO_ENCONTRADO", 404]] as const) {
            const service = criar({ criar: async () => { throw Object.assign(new Error("falha"), { codigo }); } });
            await assert.rejects(service.criarMatricula(alunoId, turmaDisciplinaId), (error: MatriculaError) => error.status === status);
        }
    });
});
