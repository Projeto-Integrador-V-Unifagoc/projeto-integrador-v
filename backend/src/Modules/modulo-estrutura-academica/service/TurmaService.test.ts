import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { TurmaService } from "./TurmaService";

function criar(overrides: {
  turma?: Record<string, any>;
  curso?: Record<string, any>;
  periodo?: Record<string, any>;
} = {}) {
  const turmaRepository = {
    buscarTurmaPorChave: async () => null,
    buscarTurmaPorId: async () => ({
      id: "t1", sigla: "A",
      periodo_letivo: { id: "pl1" }, curso: { id: "c1" },
      periodo_curricular: 1, descricao: "Turma A", capacidade_alunos: 40, turno: "NOITE", status: "ativa",
    }),
    criarTurma: async (data: any) => data,
    listarTurmas: async () => [],
    atualizarTurma: async (_id: string, data: any) => data,
    removerTurma: async () => 1,
    ...overrides.turma,
  };
  const cursoRepository = {
    buscarCursoRegistroPorId: async () => ({ id: "c1" }),
    ...overrides.curso,
  };
  const periodoLetivoRepository = {
    buscarPeriodoLetivoRegistroPorId: async () => ({ id: "pl1" }),
    ...overrides.periodo,
  };
  const service = new TurmaService();
  service.turmaRepository = turmaRepository as any;
  service.cursoRepository = cursoRepository as any;
  service.periodoLetivoRepository = periodoLetivoRepository as any;
  return { service, turmaRepository };
}

const input = {
  cursoId: "c1", periodoLetivoId: "pl1", capacidadeAlunos: 40, periodoCurricular: 2,
  descricao: "Turma A", sigla: "A", turno: "NOITE",
};

describe("TurmaService.criarTurma", () => {
  it("cria turma valida com id e status default", async () => {
    let salvo: any;
    const { service } = criar({ turma: { criarTurma: async (d: any) => ((salvo = d), d) } });
    await service.criarTurma({ ...input });
    assert.ok(salvo.id);
    assert.equal(salvo.status, "ativa");
    assert.equal(salvo.capacidade_alunos, 40);
  });

  it("rejeita curso inexistente", async () => {
    const { service } = criar({ curso: { buscarCursoRegistroPorId: async () => null } });
    await assert.rejects(() => service.criarTurma({ ...input }), /Curso nao encontrado/);
  });

  it("rejeita periodo letivo inexistente", async () => {
    const { service } = criar({ periodo: { buscarPeriodoLetivoRegistroPorId: async () => null } });
    await assert.rejects(() => service.criarTurma({ ...input }), /Periodo letivo nao encontrado/);
  });

  it("rejeita capacidade menor ou igual a zero", async () => {
    const { service } = criar();
    await assert.rejects(() => service.criarTurma({ ...input, capacidadeAlunos: 0 }), /Capacidade de alunos deve ser maior que zero/);
  });

  it("rejeita periodo curricular fora do intervalo 1..12", async () => {
    const { service } = criar();
    await assert.rejects(() => service.criarTurma({ ...input, periodoCurricular: 20 }), /entre 1 e 12/);
  });

  it("rejeita sigla duplicada para o mesmo curso e periodo letivo", async () => {
    const { service } = criar({ turma: { buscarTurmaPorChave: async () => ({ id: "t0" }) } });
    await assert.rejects(() => service.criarTurma({ ...input }), /Ja existe turma com esta sigla/);
  });
});

describe("TurmaService.atualizarTurma", () => {
  it("retorna null quando a turma nao existe", async () => {
    const { service } = criar({ turma: { buscarTurmaPorId: async () => null } });
    assert.equal(await service.atualizarTurma("x", {}), null);
  });

  it("nao checa duplicidade quando a chave nao muda", async () => {
    let checou = false;
    const { service } = criar({
      turma: { buscarTurmaPorChave: async () => ((checou = true), null), atualizarTurma: async (_i: string, d: any) => d },
    });
    await service.atualizarTurma("t1", { descricao: "Nova descricao" });
    assert.equal(checou, false);
  });

  it("checa duplicidade quando a sigla muda e rejeita conflito", async () => {
    const { service } = criar({ turma: { buscarTurmaPorChave: async () => ({ id: "outra-turma" }) } });
    await assert.rejects(() => service.atualizarTurma("t1", { sigla: "B" }), /Ja existe turma com esta sigla/);
  });

  it("atualiza combinando os dados atuais com as alteracoes", async () => {
    let salvo: any;
    const { service } = criar({ turma: { atualizarTurma: async (_id: string, d: any) => ((salvo = d), d) } });
    await service.atualizarTurma("t1", { capacidadeAlunos: 50 });
    assert.equal(salvo.capacidade_alunos, 50);
    assert.equal(salvo.sigla, "A");
    assert.equal(salvo.periodo_letivo_id, "pl1");
  });
});

describe("TurmaService leitura e remocao", () => {
  it("lista todas as turmas", async () => {
    const lista = [{ id: "t1" }];
    const { service } = criar({ turma: { listarTurmas: async () => lista } });
    assert.deepEqual(await service.listarTurmas(), lista);
  });

  it("busca uma turma pelo id", async () => {
    const turma = { id: "t1" };
    const { service } = criar({ turma: { buscarTurmaPorId: async () => turma as any } });
    assert.deepEqual(await service.buscarTurmaPorId("t1"), turma);
  });

  it("remove uma turma pelo id", async () => {
    let idRemovido: string | undefined;
    const { service } = criar({ turma: { removerTurma: async (id: string) => { idRemovido = id; return 1; } } });
    assert.equal(await service.removerTurma("t1"), 1);
    assert.equal(idRemovido, "t1");
  });
});
