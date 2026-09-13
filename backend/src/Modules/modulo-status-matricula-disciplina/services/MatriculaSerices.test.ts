import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MatriculaService } from "./MatriculaSerices";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    criarStatusMatriculaCurso: async (data: any) => data,
    listarStatusMatriculaCurso: async () => [{ id: "s1", descricao: "Matriculado" }],
    buscarStatusMatriculaCursoPorId: async (id: string) => ({ id }),
    atualizarStatusMatriculaCurso: async (_id: string, data: any) => data,
    ...overrides,
  };
  const service = new MatriculaService();
  service.matriculaRepository = repository as any;
  return { service, repository };
}

describe("MatriculaService (status matricula curso)", () => {
  it("gera id ao criar o status", async () => {
    let salvo: any;
    const { service } = criar({ criarStatusMatriculaCurso: async (d: any) => ((salvo = d), d) });
    await service.criarStatusMatriculaCurso({ descricao: "Trancado" });
    assert.ok(salvo.id);
    assert.equal(salvo.descricao, "Trancado");
  });

  it("lista os status cadastrados", async () => {
    const { service } = criar();
    assert.deepEqual(await service.listarStatusMatriculaCurso(), [{ id: "s1", descricao: "Matriculado" }]);
  });

  it("busca status por id", async () => {
    const { service } = criar();
    assert.deepEqual(await service.buscarStatusMatriculaCursoPorId("s9"), { id: "s9" });
  });

  it("repassa a atualizacao ao repositorio", async () => {
    const { service } = criar();
    assert.deepEqual(await service.atualizarStatusMatriculaCurso("s1", { descricao: "Cancelado" }), { descricao: "Cancelado" });
  });
});
