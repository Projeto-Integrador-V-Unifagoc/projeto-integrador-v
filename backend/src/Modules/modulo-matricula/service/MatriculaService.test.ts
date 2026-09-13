import { describe, it, expect } from "vitest";
import { MatriculaService } from "./MatriculaService";

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
        expect(argumentos).toEqual([cursoId, alunoId]);
    });

    it("rejeita identificadores inválidos antes de consultar o banco", async () => {
        await expect(criar().listarTurmasDisponiveis("curso")).rejects.toMatchObject({ status: 400 });
        await expect(criar().criarMatricula(alunoId, "turma")).rejects.toMatchObject({ status: 400 });
    });

    it("cria o vínculo usando o id de turma_disciplina", async () => {
        let argumentos: unknown[] = [];
        const service = criar({ criar: async (...args: unknown[]) => { argumentos = args; return { id: "m", aluno_id: alunoId, turma_id: "t", status: "ativa" }; } });
        await service.criarMatricula(alunoId, turmaDisciplinaId);
        expect(argumentos).toEqual([alunoId, turmaDisciplinaId]);
    });

    it("traduz duplicidade, indisponibilidade e ausência para o status HTTP correto", async () => {
        for (const [codigo, status] of [["DUPLICADA", 409], ["SEM_VAGAS", 409], ["INDISPONIVEL", 409], ["NAO_ENCONTRADO", 404], ["CURSO_DIVERGENTE", 400]] as const) {
            const service = criar({ criar: async () => { throw Object.assign(new Error("falha"), { codigo }); } });
            await expect(service.criarMatricula(alunoId, turmaDisciplinaId)).rejects.toMatchObject({ status });
        }
    });

    it("traduz erro de chave duplicada do postgres (code 23505)", async () => {
        const service = criar({ criar: async () => { throw Object.assign(new Error("falha"), { code: "23505" }); } });
        await expect(service.criarMatricula(alunoId, turmaDisciplinaId)).rejects.toMatchObject({ status: 409 });
    });

    it("repropaga erros nao mapeados de criarMatricula", async () => {
        const service = criar({ criar: async () => { throw new Error("erro inesperado"); } });
        await expect(service.criarMatricula(alunoId, turmaDisciplinaId)).rejects.toThrow("erro inesperado");
    });

    it("listarTodas delega ao repositorio", async () => {
        const dados = [{ id: "m1" }];
        const service = criar({ listarTodas: async () => dados as any });
        await expect(service.listarTodas()).resolves.toEqual(dados);
    });

    it("listarPorAluno delega ao repositorio", async () => {
        const dados = [{ id: "m1" }];
        const service = criar({ listarPorAluno: async () => dados as any });
        await expect(service.listarPorAluno(alunoId)).resolves.toEqual(dados);
    });

    it("cancelar rejeita quando a matricula nao existe", async () => {
        const service = criar({ buscarPorId: async () => null });
        await expect(service.cancelar("m1")).rejects.toMatchObject({ status: 404 });
    });

    it("cancelar rejeita quando a matricula ja esta cancelada", async () => {
        const service = criar({ buscarPorId: async () => ({ id: "m1", status: "Cancelada" } as any) });
        await expect(service.cancelar("m1")).rejects.toMatchObject({ status: 409 });
    });

    it("cancelar delega ao repositorio quando a matricula pode ser cancelada", async () => {
        const cancelada = { id: "m1", status: "cancelada" };
        const service = criar({ buscarPorId: async () => ({ id: "m1", status: "ativa" } as any), cancelar: async () => cancelada as any });
        await expect(service.cancelar("m1")).resolves.toEqual(cancelada);
    });

    it("consultarStatusPorMatricula rejeita numero de matricula invalido", async () => {
        const service = criar();
        await expect(service.consultarStatusPorMatricula(0)).rejects.toThrow("Número de matrícula inválido.");
        await expect(service.consultarStatusPorMatricula(NaN)).rejects.toThrow("Número de matrícula inválido.");
    });

    it("consultarStatusPorMatricula rejeita quando aluno nao e encontrado", async () => {
        const service = criar({ consultarStatusPorMatricula: async () => null });
        await expect(service.consultarStatusPorMatricula(123)).rejects.toThrow("não encontrado");
    });

    it("consultarStatusPorMatricula retorna o resultado do repositorio", async () => {
        const resultado = { matricula: 123, status: "ativa" };
        const service = criar({ consultarStatusPorMatricula: async () => resultado as any });
        await expect(service.consultarStatusPorMatricula(123)).resolves.toEqual(resultado);
    });

    it("atualizarStatus rejeita status invalido", async () => {
        const service = criar();
        await expect(service.atualizarStatus("m1", "invalido")).rejects.toMatchObject({ status: 400 });
    });

    it("atualizarStatus rejeita quando a matricula nao existe", async () => {
        const service = criar({ buscarPorId: async () => null });
        await expect(service.atualizarStatus("m1", "ativa")).rejects.toMatchObject({ status: 404 });
    });

    it("atualizarStatus normaliza acentos, caixa e sinonimos antes de persistir", async () => {
        let statusPersistido: unknown;
        const service = criar({
            buscarPorId: async () => ({ id: "m1", status: "ativa" } as any),
            atualizarStatus: async (_id: string, status: string) => { statusPersistido = status; return { id: "m1", status } as any; },
        });
        await service.atualizarStatus("m1", "  CONCLUÍDO  ");
        expect(statusPersistido).toBe("concluida");
    });
});
