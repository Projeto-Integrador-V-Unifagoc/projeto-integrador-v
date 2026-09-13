import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MatriculaService } from "./MatriculaService";
import { MatriculaError } from "../errors/MatriculaError";
import type { MatriculaRepository } from "../repository/MatriculaRepository";

const alunoId = "11111111-1111-4111-8111-111111111111";
const cursoId = "22222222-2222-4222-8222-222222222222";
const turmaId = "33333333-3333-4333-8333-333333333333";
const matriculaId = "44444444-4444-4444-8444-444444444444";
const turmaDisciplinaId = "55555555-5555-4555-8555-555555555555";
const vinculoId = "66666666-6666-4666-8666-666666666666";

const matriculaBase = {
    id: matriculaId,
    aluno_id: alunoId,
    curso_id: cursoId,
    turma_id: turmaId,
    status: "ativa",
    data_matricula: "2026-01-10",
};

/**
 * Dublê do repositório com o caminho feliz preenchido. Cada teste sobrescreve
 * apenas o método relevante, de modo que a intenção do cenário fique explícita.
 */
function criarService(overrides: Partial<Record<keyof MatriculaRepository, unknown>> = {}) {
    const repository = {
        transacao: async (callback: (trx: unknown) => Promise<unknown>) => callback({}),
        buscarAluno: async () => ({ id: alunoId, curso_id: cursoId }),
        buscarTurma: async () => ({ id: turmaId, curso_id: cursoId, status: "ativa", capacidade_alunos: 30 }),
        buscarMatriculaAtivaDoAluno: async () => null,
        contarOcupacaoDaTurma: async () => 0,
        listarIdsDisciplinasAtivasDaTurma: async () => [turmaDisciplinaId],
        listarTurmaDisciplinasValidas: async () => [{ id: turmaDisciplinaId }],
        criarComVinculos: async () => ({ matricula: matriculaBase, vinculosCriados: 1 }),
        listarTurmasDisponiveis: async () => [],
        listarDisciplinasDaTurma: async () => [],
        listarTodas: async () => [],
        listarPorAluno: async () => [],
        listarVinculos: async () => [],
        buscarPorId: async () => matriculaBase,
        consultarPorNumeroMatricula: async () => null,
        cancelarComVinculos: async () => ({ ...matriculaBase, status: "cancelada" }),
        atualizarStatus: async () => matriculaBase,
        adicionarVinculos: async () => 1,
        buscarVinculo: async () => ({ id: vinculoId, matricula_id: matriculaId, status: "ativa" }),
        cancelarVinculo: async () => ({ id: vinculoId, status: "cancelada" }),
        ...overrides,
    };
    return new MatriculaService(repository as unknown as MatriculaRepository);
}

function statusDoErro(erro: unknown): number | undefined {
    return erro instanceof MatriculaError ? erro.status : undefined;
}

describe("MatriculaService", () => {
    it("exige alunoId e turmaId antes de abrir a transação", async () => {
        await assert.rejects(criarService().criarMatricula("", turmaId), (e) => statusDoErro(e) === 400);
        await assert.rejects(criarService().criarMatricula(alunoId, ""), (e) => statusDoErro(e) === 400);
    });

    it("rejeita identificador fora do formato UUID com 400, sem consultar o banco", async () => {
        let consultou = false;
        const marcar = async () => {
            consultou = true;
            return null;
        };
        const service = criarService({ buscarAluno: marcar, buscarPorId: marcar });

        await assert.rejects(service.criarMatricula("x", turmaId), (e) => statusDoErro(e) === 400);
        await assert.rejects(service.criarMatricula(alunoId, "y"), (e) => statusDoErro(e) === 400);
        await assert.rejects(service.listarPorAluno("x"), (e) => statusDoErro(e) === 400);
        await assert.rejects(service.aprovar("x"), (e) => statusDoErro(e) === 400);
        await assert.rejects(service.cancelar("x"), (e) => statusDoErro(e) === 400);

        assert.equal(consultou, false);
    });

    it("rejeita turma inexistente e aluno inexistente com 404", async () => {
        await assert.rejects(
            criarService({ buscarAluno: async () => null }).criarMatricula(alunoId, turmaId),
            (e) => statusDoErro(e) === 404,
        );
        await assert.rejects(
            criarService({ buscarTurma: async () => null }).criarMatricula(alunoId, turmaId),
            (e) => statusDoErro(e) === 404,
        );
    });

    it("rejeita turma inativa, curso divergente, turma cheia e matrícula em aberto com 409", async () => {
        const cenarios: Partial<Record<keyof MatriculaRepository, unknown>>[] = [
            { buscarTurma: async () => ({ id: turmaId, curso_id: cursoId, status: "encerrada", capacidade_alunos: 30 }) },
            { buscarAluno: async () => ({ id: alunoId, curso_id: "outro-curso" }) },
            { contarOcupacaoDaTurma: async () => 30 },
            { buscarMatriculaAtivaDoAluno: async () => ({ ...matriculaBase, turma_id: "outra-turma" }) },
        ];

        for (const cenario of cenarios) {
            await assert.rejects(
                criarService(cenario).criarMatricula(alunoId, turmaId),
                (e) => statusDoErro(e) === 409,
            );
        }
    });

    it("vincula todas as disciplinas ativas quando nenhuma é informada", async () => {
        let recebido: any = null;
        const service = criarService({
            criarComVinculos: async (dados: any) => {
                recebido = dados;
                return { matricula: matriculaBase, vinculosCriados: 1 };
            },
        });

        const resultado = await service.criarMatricula(alunoId, turmaId);

        assert.deepEqual(recebido.turmaDisciplinaIds, [turmaDisciplinaId]);
        assert.equal(resultado.disciplinas_vinculadas, 1);
    });

    it("rejeita disciplina que não pertence à turma com 400", async () => {
        const service = criarService({ listarTurmaDisciplinasValidas: async () => [] });
        await assert.rejects(
            service.criarMatricula(alunoId, turmaId, [turmaDisciplinaId]),
            (e) => statusDoErro(e) === 400,
        );
    });

    it("traduz violação de unicidade do PostgreSQL em 409", async () => {
        const service = criarService({
            criarComVinculos: async () => {
                throw Object.assign(new Error("duplicate key"), { code: "23505" });
            },
        });
        await assert.rejects(service.criarMatricula(alunoId, turmaId), (e) => statusDoErro(e) === 409);
    });

    it("aceita os status do domínio, inclusive pendente, e recusa os demais", async () => {
        for (const status of ["pendente", "ativa", "trancada", "concluida"]) {
            const atualizado = await criarService().atualizarStatus(matriculaId, status);
            assert.ok(atualizado);
        }
        await assert.rejects(
            criarService().atualizarStatus(matriculaId, "MATRICULADO"),
            (e) => statusDoErro(e) === 400,
        );
    });

    it("cancelar pela rota de status também encerra os vínculos", async () => {
        let encerrouVinculos = false;
        const service = criarService({
            cancelarComVinculos: async () => {
                encerrouVinculos = true;
                return { ...matriculaBase, status: "cancelada" };
            },
        });

        await service.atualizarStatus(matriculaId, "cancelada");

        assert.equal(encerrouVinculos, true);
    });

    it("recusa cancelar uma matrícula já cancelada", async () => {
        const service = criarService({ buscarPorId: async () => ({ ...matriculaBase, status: "cancelada" }) });
        await assert.rejects(service.cancelar(matriculaId), (e) => statusDoErro(e) === 409);
    });

    it("recusa vínculo que não pertence à matrícula informada", async () => {
        const service = criarService({
            buscarVinculo: async () => ({ id: vinculoId, matricula_id: "outra-matricula", status: "ativa" }),
        });
        await assert.rejects(service.cancelarVinculo(matriculaId, vinculoId), (e) => statusDoErro(e) === 400);
    });

    it("não vincula disciplinas a uma matrícula cancelada", async () => {
        const service = criarService({ buscarPorId: async () => ({ ...matriculaBase, status: "cancelada" }) });
        await assert.rejects(
            service.adicionarDisciplinas(matriculaId, [turmaDisciplinaId]),
            (e) => statusDoErro(e) === 409,
        );
    });
});
