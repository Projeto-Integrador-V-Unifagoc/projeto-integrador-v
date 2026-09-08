import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EstruturaAcademicaError } from "../errors/EstruturaAcademicaError";
import { PeriodoLetivoService } from "./PeriodoLetivoService";
import { TurmaDisciplinaService } from "./TurmaDisciplinaService";
import { TurmaService } from "./TurmaService";

const turmaBase = {
    id: "turma-1",
    periodo_curricular: 1,
    descricao: "Turma A",
    sigla: "A",
    capacidade_alunos: 30,
    turno: "noturno",
    status: "ativa",
    periodo_letivo: { id: "periodo-1", codigo: "2026/1", ano: 2026, semestre: 1 },
    curso: { id: "curso-1", codigo: "ADS", nome: "ADS" }
};

const payloadTurma = {
    periodoLetivoId: "periodo-1",
    cursoId: "curso-1",
    periodoCurricular: 1,
    descricao: "Turma A",
    sigla: "A",
    capacidadeAlunos: 30,
    turno: "noturno",
    status: "ativa"
};

function statusDoErro(error: unknown) {
    return error instanceof EstruturaAcademicaError ? error.status : undefined;
}

function criarTurmaService(uso = { disciplinas: 0, matriculas: 0, ocupacao: 0 }) {
    const service = new TurmaService();
    service.turmaRepository = {
        buscarTurmaPorId: async () => turmaBase,
        buscarTurmaRegistroPorId: async () => turmaBase,
        buscarTurmaPorChave: async () => null,
        obterUsoDaTurma: async () => uso,
        atualizarTurma: async (_id: string, data: unknown) => data,
        criarTurma: async (data: unknown) => data,
        removerTurma: async () => 1
    } as any;
    service.cursoRepository = {
        buscarCursoRegistroPorId: async () => ({ id: "curso-1" })
    } as any;
    service.periodoLetivoRepository = {
        buscarPeriodoLetivoRegistroPorId: async () => ({ id: "periodo-1", ativo: true, status: "ativo" })
    } as any;
    return service;
}

describe("TurmaService", () => {
    it("rejeita criacao em periodo encerrado", async () => {
        const service = criarTurmaService();
        service.periodoLetivoRepository = {
            buscarPeriodoLetivoRegistroPorId: async () => ({ id: "periodo-1", ativo: true, status: "encerrado" })
        } as any;

        await assert.rejects(service.criarTurma(payloadTurma), (error) => statusDoErro(error) === 409);
    });

    it("mantem compatibilidade com o turno NOITE e o normaliza", async () => {
        const service = criarTurmaService();
        const criada = await service.criarTurma({ ...payloadTurma, turno: "NOITE" }) as any;

        assert.equal(criada.turno, "noturno");
    });

    it("bloqueia alteracao de curso quando a turma possui disciplinas", async () => {
        const service = criarTurmaService({ disciplinas: 2, matriculas: 0, ocupacao: 0 });

        await assert.rejects(
            service.atualizarTurma("turma-1", { ...payloadTurma, cursoId: "curso-2" }),
            (error) => statusDoErro(error) === 409 && (error as EstruturaAcademicaError).codigo === "TURMA_EM_USO"
        );
    });

    it("nao permite reduzir capacidade abaixo da ocupacao", async () => {
        const service = criarTurmaService({ disciplinas: 0, matriculas: 12, ocupacao: 12 });

        await assert.rejects(
            service.atualizarTurma("turma-1", { ...payloadTurma, capacidadeAlunos: 10 }),
            (error) => statusDoErro(error) === 409
        );
    });

    it("expoe o motivo usado para bloquear os campos estruturais", async () => {
        const service = criarTurmaService({ disciplinas: 3, matriculas: 8, ocupacao: 7 });
        const turma = await service.buscarTurmaPorId("turma-1");

        assert.equal(turma?.estrutura_bloqueada, true);
        assert.equal(turma?.ocupacao_alunos, 7);
        assert.match(turma?.motivo_bloqueio_estrutura ?? "", /3 disciplina\(s\).*8 matricula\(s\)/);
    });
});

describe("TurmaDisciplinaService", () => {
    function criarService() {
        const service = new TurmaDisciplinaService();
        service.turmaRepository = { buscarTurmaPorId: async () => turmaBase } as any;
        service.cursoDisciplinaRepository = {
            buscarCursoDisciplinaPorId: async () => ({
                id: "cd-1",
                ativo: true,
                curso: { id: "curso-1" },
                disciplina: { id: "disciplina-1", ativo: true }
            })
        } as any;
        service.professorRepository = { buscarProfessorAtivoPorId: async () => ({ id: "professor-1" }) } as any;
        service.turmaDisciplinaRepository = {
            buscarTurmaDisciplinaPorTurmaECursoDisciplina: async () => null,
            criarTurmaDisciplina: async (data: unknown) => data,
            buscarTurmaDisciplinaPorId: async () => ({ id: "td-1", status: "ativa", turma: { id: "turma-1" } }),
            removerSeSemDependencias: async () => ({
                removidos: 0,
                dependencias: { alunos: 4, avaliacoes: 1, aulas: 2, notas: 8, frequencias: 12, lancamentos: 23, emUso: true }
            })
        } as any;
        return service;
    }

    it("rejeita associacao curricular inativa", async () => {
        const service = criarService();
        service.cursoDisciplinaRepository = {
            buscarCursoDisciplinaPorId: async () => ({
                id: "cd-1",
                ativo: false,
                curso: { id: "curso-1" },
                disciplina: { id: "disciplina-1", ativo: true }
            })
        } as any;

        await assert.rejects(
            service.criarTurmaDisciplina("turma-1", { cursoDisciplinaId: "cd-1", professorId: "professor-1" }),
            (error) => statusDoErro(error) === 409
        );
    });

    it("retorna conflito e preserva oferta que possui historico", async () => {
        const service = criarService();

        await assert.rejects(
            service.removerTurmaDisciplina("turma-1", "td-1"),
            (error) => statusDoErro(error) === 409 && (error as EstruturaAcademicaError).codigo === "OFERTA_COM_HISTORICO"
        );
    });
});

describe("PeriodoLetivoService", () => {
    it("impede exclusao de periodo que possui turmas", async () => {
        const service = new PeriodoLetivoService();
        service.periodoLetivoRepository = {
            possuiTurmas: async () => true,
            removerPeriodoLetivo: async () => 1
        } as any;

        await assert.rejects(service.removerPeriodoLetivo("periodo-1"), (error) => statusDoErro(error) === 409);
    });
});
