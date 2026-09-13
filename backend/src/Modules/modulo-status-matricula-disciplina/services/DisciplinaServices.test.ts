import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DisciplinaService } from "./DisciplinaServices";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    criarStatusMatriculaDisciplina: async (data: any) => data,
    listarStatusMatriculaDisciplina: async () => [{ id: "s1", descricao: "Cursando" }],
    buscarStatusMatriculaDisciplinaPorId: async (id: string) => ({ id }),
    atualizarStatusMatriculaDisciplina: async (_id: string, data: any) => data,
    ...overrides,
  };
  const service = new DisciplinaService();
  service.disciplinaRepository = repository as any;
  return { service, repository };
}

describe("DisciplinaService (status matricula disciplina)", () => {
  it("gera id ao criar o status", async () => {
    let salvo: any;
    const { service } = criar({ criarStatusMatriculaDisciplina: async (d: any) => ((salvo = d), d) });
    await service.criarStatusMatriculaDisciplina({ descricao: "Aprovado" });
    assert.ok(salvo.id);
    assert.equal(salvo.descricao, "Aprovado");
  });

  it("lista os status cadastrados", async () => {
    const { service } = criar();
    assert.deepEqual(await service.listarStatusMatriculaDisciplina(), [{ id: "s1", descricao: "Cursando" }]);
  });

  it("repassa a atualizacao ao repositorio", async () => {
    const { service } = criar();
    assert.deepEqual(await service.atualizarStatusMatriculaDisciplina("s1", { descricao: "Reprovado" }), { descricao: "Reprovado" });
  });

  it("busca status por id", async () => {
    const { service } = criar();
    assert.deepEqual(await service.buscarStatusMatriculaDisciplinaPorId("s9"), { id: "s9" });
  });
});
