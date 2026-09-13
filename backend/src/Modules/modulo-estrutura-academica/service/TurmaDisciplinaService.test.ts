import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { TurmaDisciplinaService } from "./TurmaDisciplinaService";

function criar(overrides: {
  turmaDisciplina?: Record<string, any>;
  turma?: Record<string, any>;
  cursoDisciplina?: Record<string, any>;
  professor?: Record<string, any>;
} = {}) {
  const turmaDisciplinaRepository = {
    buscarTurmaDisciplinaPorTurmaECursoDisciplina: async () => null,
    buscarTurmaDisciplinaPorId: async () => ({ id: "td1", turma: { id: "t1" } }),
    criarTurmaDisciplina: async (data: any) => data,
    listarTurmaDisciplinasPorTurmaId: async () => [],
    atualizarTurmaDisciplina: async (_id: string, data: any) => data,
    removerTurmaDisciplina: async () => 1,
    ...overrides.turmaDisciplina,
  };
  const turmaRepository = {
    buscarTurmaPorId: async () => ({ id: "t1", curso: { id: "c1" } }),
    buscarTurmaRegistroPorId: async () => ({ id: "t1" }),
    ...overrides.turma,
  };
  const cursoDisciplinaRepository = {
    buscarCursoDisciplinaPorId: async () => ({ id: "cd1", curso: { id: "c1" } }),
    ...overrides.cursoDisciplina,
  };
  const professorRepository = {
    buscarProfessorAtivoPorId: async () => ({ id: "prof1", ativo: true }),
    ...overrides.professor,
  };
  const service = new TurmaDisciplinaService();
  service.turmaDisciplinaRepository = turmaDisciplinaRepository as any;
  service.turmaRepository = turmaRepository as any;
  service.cursoDisciplinaRepository = cursoDisciplinaRepository as any;
  service.professorRepository = professorRepository as any;
  return { service, turmaDisciplinaRepository };
}

const input = { cursoDisciplinaId: "cd1", professorId: "prof1" };

describe("TurmaDisciplinaService.criarTurmaDisciplina", () => {
  it("cria o vinculo quando tudo e consistente", async () => {
    let salvo: any;
    const { service } = criar({ turmaDisciplina: { criarTurmaDisciplina: async (d: any) => ((salvo = d), d) } });
    await service.criarTurmaDisciplina("t1", { ...input });
    assert.ok(salvo.id);
    assert.equal(salvo.turma_id, "t1");
    assert.equal(salvo.status, "ativa");
  });

  it("rejeita turma inexistente", async () => {
    const { service } = criar({ turma: { buscarTurmaPorId: async () => null } });
    await assert.rejects(() => service.criarTurmaDisciplina("t1", { ...input }), /Turma nao encontrada/);
  });

  it("rejeita associacao curso-disciplina inexistente", async () => {
    const { service } = criar({ cursoDisciplina: { buscarCursoDisciplinaPorId: async () => null } });
    await assert.rejects(() => service.criarTurmaDisciplina("t1", { ...input }), /Associacao curso disciplina nao encontrada/);
  });

  it("rejeita disciplina de outro curso", async () => {
    const { service } = criar({ cursoDisciplina: { buscarCursoDisciplinaPorId: async () => ({ id: "cd1", curso: { id: "c2" } }) } });
    await assert.rejects(() => service.criarTurmaDisciplina("t1", { ...input }), /nao pertence a matriz curricular/);
  });

  it("rejeita professor inexistente", async () => {
    const { service } = criar({ professor: { buscarProfessorAtivoPorId: async () => null } });
    await assert.rejects(() => service.criarTurmaDisciplina("t1", { ...input }), /Professor nao encontrado/);
  });

  it("rejeita disciplina ja adicionada a turma", async () => {
    const { service } = criar({ turmaDisciplina: { buscarTurmaDisciplinaPorTurmaECursoDisciplina: async () => ({ id: "td0" }) } });
    await assert.rejects(() => service.criarTurmaDisciplina("t1", { ...input }), /ja adicionada a esta turma/);
  });
});

describe("TurmaDisciplinaService.atualizarTurmaDisciplina", () => {
  it("retorna null quando o vinculo nao pertence a turma", async () => {
    const { service } = criar({ turmaDisciplina: { buscarTurmaDisciplinaPorId: async () => ({ id: "td1", turma: { id: "outra" } }) } });
    assert.equal(await service.atualizarTurmaDisciplina("t1", "td1", {}), null);
  });

  it("rejeita quando a turma referenciada nao existe", async () => {
    const { service } = criar({ turma: { buscarTurmaRegistroPorId: async () => null } });
    await assert.rejects(() => service.atualizarTurmaDisciplina("t1", "td1", {}), /Turma nao encontrada/);
  });

  it("valida o professor informado na atualizacao", async () => {
    const { service } = criar({ professor: { buscarProfessorAtivoPorId: async () => null } });
    await assert.rejects(() => service.atualizarTurmaDisciplina("t1", "td1", { professorId: "x" }), /Professor nao encontrado/);
  });

  it("atualiza sem validar professor quando ele nao e informado", async () => {
    let salvo: any;
    let chamouBuscaProfessor = false;
    const { service } = criar({
      turmaDisciplina: { atualizarTurmaDisciplina: async (_id: string, d: any) => ((salvo = d), d) },
      professor: { buscarProfessorAtivoPorId: async () => { chamouBuscaProfessor = true; return null; } },
    });
    await service.atualizarTurmaDisciplina("t1", "td1", { status: "encerrada" });
    assert.equal(chamouBuscaProfessor, false);
    assert.equal(salvo.status, "encerrada");
  });

  it("atualiza com o professor validado", async () => {
    let salvo: any;
    const { service } = criar({ turmaDisciplina: { atualizarTurmaDisciplina: async (_id: string, d: any) => ((salvo = d), d) } });
    await service.atualizarTurmaDisciplina("t1", "td1", { professorId: "prof1", status: "ativa" });
    assert.equal(salvo.professor_id, "prof1");
  });
});

describe("TurmaDisciplinaService.listarTurmaDisciplinasPorTurmaId", () => {
  it("rejeita turma inexistente", async () => {
    const { service } = criar({ turma: { buscarTurmaRegistroPorId: async () => null } });
    await assert.rejects(() => service.listarTurmaDisciplinasPorTurmaId("t1"), /Turma nao encontrada/);
  });

  it("lista as disciplinas da turma existente", async () => {
    const lista = [{ id: "td1" }];
    const { service } = criar({ turmaDisciplina: { listarTurmaDisciplinasPorTurmaId: async () => lista } });
    assert.deepEqual(await service.listarTurmaDisciplinasPorTurmaId("t1"), lista);
  });
});

describe("TurmaDisciplinaService.removerTurmaDisciplina", () => {
  it("retorna 0 quando o vinculo nao pertence a turma", async () => {
    const { service } = criar({ turmaDisciplina: { buscarTurmaDisciplinaPorId: async () => ({ id: "td1", turma: { id: "outra" } }) } });
    assert.equal(await service.removerTurmaDisciplina("t1", "td1"), 0);
  });

  it("remove o vinculo quando pertence a turma", async () => {
    let idRemovido: string | undefined;
    const { service } = criar({ turmaDisciplina: { removerTurmaDisciplina: async (id: string) => { idRemovido = id; return 1; } } });
    assert.equal(await service.removerTurmaDisciplina("t1", "td1"), 1);
    assert.equal(idRemovido, "td1");
  });
});
