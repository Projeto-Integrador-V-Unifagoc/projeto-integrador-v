import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { CursoDisciplinaService } from "./CursoDisciplinaService";

function criar(overrides: {
  cursoDisciplina?: Record<string, any>;
  curso?: Record<string, any>;
  disciplina?: Record<string, any>;
} = {}) {
  const cursoDisciplinaRepository = {
    buscarCursoDisciplinaPorCursoEDisciplina: async () => null,
    buscarCursoDisciplinaPorId: async () => ({ id: "cd1", periodo_ideal: 1 }),
    criarCursoDisciplina: async (data: any) => data,
    listarCursoDisciplinas: async () => [],
    listarMatrizCurricularPorCursoId: async () => [],
    atualizarCursoDisciplina: async (_id: string, data: any) => data,
    removerCursoDisciplina: async () => 1,
    ...overrides.cursoDisciplina,
  };
  const cursoRepository = {
    buscarCursoRegistroPorId: async () => ({ id: "c1" }),
    ...overrides.curso,
  };
  const disciplinaRepository = {
    buscarDisciplinaPorId: async () => ({ id: "d1", carga_horaria: 60 }),
    ...overrides.disciplina,
  };
  const service = new CursoDisciplinaService();
  service.cursoDisciplinaRepository = cursoDisciplinaRepository as any;
  service.cursoRepository = cursoRepository as any;
  service.disciplinaRepository = disciplinaRepository as any;
  return { service, cursoDisciplinaRepository };
}

const input = { cursoId: "c1", disciplinaId: "d1", periodoIdeal: 2, cargaHoraria: 80 };

describe("CursoDisciplinaService.criarCursoDisciplina", () => {
  it("cria a associacao quando curso e disciplina existem", async () => {
    let salvo: any;
    const { service } = criar({ cursoDisciplina: { criarCursoDisciplina: async (d: any) => ((salvo = d), d) } });
    await service.criarCursoDisciplina({ ...input });
    assert.ok(salvo.id);
    assert.equal(salvo.curso_id, "c1");
    assert.equal(salvo.carga_horaria, 80);
  });

  it("usa a carga horaria da disciplina quando nao informada", async () => {
    let salvo: any;
    const { service } = criar({ cursoDisciplina: { criarCursoDisciplina: async (d: any) => ((salvo = d), d) } });
    await service.criarCursoDisciplina({ cursoId: "c1", disciplinaId: "d1", periodoIdeal: 1 });
    assert.equal(salvo.carga_horaria, 60);
  });

  it("rejeita curso inexistente", async () => {
    const { service } = criar({ curso: { buscarCursoRegistroPorId: async () => null } });
    await assert.rejects(() => service.criarCursoDisciplina({ ...input }), /Curso nao encontrado/);
  });

  it("rejeita disciplina inexistente", async () => {
    const { service } = criar({ disciplina: { buscarDisciplinaPorId: async () => null } });
    await assert.rejects(() => service.criarCursoDisciplina({ ...input }), /Disciplina nao encontrada/);
  });

  it("rejeita associacao duplicada", async () => {
    const { service } = criar({ cursoDisciplina: { buscarCursoDisciplinaPorCursoEDisciplina: async () => ({ id: "cd0" }) } });
    await assert.rejects(() => service.criarCursoDisciplina({ ...input }), /ja associada/);
  });

  it("rejeita periodo ideal fora do intervalo 1..12", async () => {
    const { service } = criar();
    await assert.rejects(() => service.criarCursoDisciplina({ ...input, periodoIdeal: 13 }), /entre 1 e 12/);
  });
});

describe("CursoDisciplinaService.atualizarCursoDisciplina", () => {
  it("retorna null quando a associacao nao existe", async () => {
    const { service } = criar({ cursoDisciplina: { buscarCursoDisciplinaPorId: async () => null } });
    assert.equal(await service.atualizarCursoDisciplina("x", {}), null);
  });

  it("valida periodo ideal informado", async () => {
    const { service } = criar();
    await assert.rejects(() => service.atualizarCursoDisciplina("cd1", { periodoIdeal: 0 }), /entre 1 e 12/);
  });

  it("nao valida o periodo ideal quando nao informado ou vazio", async () => {
    let salvo: any;
    const { service } = criar({ cursoDisciplina: { atualizarCursoDisciplina: async (_id: string, d: any) => ((salvo = d), d) } });
    await service.atualizarCursoDisciplina("cd1", { periodoIdeal: "", obrigatoria: false, cargaHoraria: 90, ativo: false });
    assert.equal(salvo.periodo_ideal, undefined);
    assert.equal(salvo.carga_horaria, 90);
    assert.equal(salvo.obrigatoria, false);
    assert.equal(salvo.ativo, false);
  });

  it("atualiza a associacao com o periodo ideal informado", async () => {
    let salvo: any;
    const { service } = criar({ cursoDisciplina: { atualizarCursoDisciplina: async (_id: string, d: any) => ((salvo = d), d) } });
    await service.atualizarCursoDisciplina("cd1", { periodoIdeal: 3 });
    assert.equal(salvo.periodo_ideal, 3);
  });
});

describe("CursoDisciplinaService.listarMatrizCurricularPorCursoId", () => {
  it("rejeita curso inexistente", async () => {
    const { service } = criar({ curso: { buscarCursoRegistroPorId: async () => null } });
    await assert.rejects(() => service.listarMatrizCurricularPorCursoId("x"), /Curso nao encontrado/);
  });

  it("retorna a matriz curricular do curso existente", async () => {
    const matriz = [{ id: "cd1" }];
    const { service } = criar({ cursoDisciplina: { listarMatrizCurricularPorCursoId: async () => matriz } });
    assert.deepEqual(await service.listarMatrizCurricularPorCursoId("c1", 2), matriz);
  });
});

describe("CursoDisciplinaService leitura e remocao", () => {
  it("lista todas as associacoes", async () => {
    const lista = [{ id: "cd1" }];
    const { service } = criar({ cursoDisciplina: { listarCursoDisciplinas: async () => lista } });
    assert.deepEqual(await service.listarCursoDisciplinas(), lista);
  });

  it("remove a associacao pelo id", async () => {
    let idRemovido: string | undefined;
    const { service } = criar({ cursoDisciplina: { removerCursoDisciplina: async (id: string) => { idRemovido = id; return 1; } } });
    assert.equal(await service.removerCursoDisciplina("cd1"), 1);
    assert.equal(idRemovido, "cd1");
  });
});
