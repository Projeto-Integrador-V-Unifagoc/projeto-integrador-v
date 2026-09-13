import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DisciplinaService } from "./DisciplinaService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    buscarDisciplinaPorCodigo: async (_codigo: string) => null,
    buscarDisciplinaPorId: async (_id: string) => ({ id: "d1", codigo: "MAT101", nome: "Matematica", carga_horaria: 60 }),
    criarDisciplina: async (data: any) => data,
    listarDisciplinas: async () => [],
    atualizarDisciplina: async (_id: string, data: any) => data,
    removerDisciplina: async (_id: string) => 1,
    ...overrides,
  };
  const service = new DisciplinaService();
  service.disciplinaRepository = repository as any;
  return { service, repository };
}

describe("DisciplinaService.criarDisciplina", () => {
  it("cria a disciplina com id gerado e carga horaria numerica", async () => {
    let salvo: any;
    const { service } = criar({ criarDisciplina: async (d: any) => ((salvo = d), d) });
    await service.criarDisciplina({ codigo: "MAT101", nome: "Matematica", cargaHoraria: "60", preRequisito: null });
    assert.ok(salvo.id);
    assert.equal(salvo.carga_horaria, 60);
    assert.equal(salvo.ativo, true);
  });

  it("rejeita codigo ja existente", async () => {
    const { service } = criar({ buscarDisciplinaPorCodigo: async () => ({ id: "outra" }) });
    await assert.rejects(
      () => service.criarDisciplina({ codigo: "MAT101", nome: "Matematica", cargaHoraria: 60 }),
      /Ja existe disciplina com este codigo/,
    );
  });
});

describe("DisciplinaService.atualizarDisciplina", () => {
  it("retorna null quando a disciplina nao existe", async () => {
    const { service } = criar({ buscarDisciplinaPorId: async () => null });
    assert.equal(await service.atualizarDisciplina("x", { nome: "Novo" }), null);
  });

  it("rejeita troca para um codigo usado por outra disciplina", async () => {
    const { service } = criar({
      buscarDisciplinaPorId: async () => ({ id: "d1", codigo: "MAT101" }),
      buscarDisciplinaPorCodigo: async () => ({ id: "d2", codigo: "MAT202" }),
    });
    await assert.rejects(
      () => service.atualizarDisciplina("d1", { codigo: "MAT202" }),
      /Ja existe disciplina com este codigo/,
    );
  });

  it("permite manter o mesmo codigo sem checar duplicidade", async () => {
    let checou = false;
    const { service } = criar({
      buscarDisciplinaPorId: async () => ({ id: "d1", codigo: "MAT101" }),
      buscarDisciplinaPorCodigo: async () => ((checou = true), null),
      atualizarDisciplina: async (_id: string, d: any) => d,
    });
    await service.atualizarDisciplina("d1", { codigo: "MAT101", nome: "Matematica I" });
    assert.equal(checou, false);
  });
});

describe("DisciplinaService.atualizarDisciplina cargaHoraria", () => {
  it("converte a carga horaria informada para numero", async () => {
    let salvo: any;
    const { service } = criar({ atualizarDisciplina: async (_id: string, d: any) => ((salvo = d), d) });
    await service.atualizarDisciplina("d1", { cargaHoraria: "80" });
    assert.equal(salvo.carga_horaria, 80);
  });
});

describe("DisciplinaService leitura e remocao", () => {
  it("lista todas as disciplinas", async () => {
    const lista = [{ id: "d1" }];
    const { service } = criar({ listarDisciplinas: async () => lista });
    assert.deepEqual(await service.listarDisciplinas(), lista);
  });

  it("busca uma disciplina pelo id", async () => {
    const disciplina = { id: "d1" };
    const { service } = criar({ buscarDisciplinaPorId: async () => disciplina as any });
    assert.deepEqual(await service.buscarDisciplinaPorId("d1"), disciplina);
  });

  it("remove uma disciplina pelo id", async () => {
    let idRemovido: string | undefined;
    const { service } = criar({ removerDisciplina: async (id: string) => { idRemovido = id; return 1; } });
    assert.equal(await service.removerDisciplina("d1"), 1);
    assert.equal(idRemovido, "d1");
  });
});
