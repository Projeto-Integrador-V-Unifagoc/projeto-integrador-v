import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DepartamentoService } from "./DepartamentoService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    criarDepartamento: async (data: any) => data,
    listarDepartamentos: async () => [],
    buscarDepartamentoPorId: async (id: string) => ({ id }),
    ...overrides,
  };
  const service = new DepartamentoService();
  service.departamentoRepository = repository as any;
  return { service, repository };
}

describe("DepartamentoService", () => {
  it("gera id e mapeia faculdadeId para faculdade_id ao criar", async () => {
    let salvo: any;
    const { service } = criar({ criarDepartamento: async (d: any) => ((salvo = d), d) });
    await service.criarDepartamento({ codigo: "DCC", nome: "Computacao", faculdadeId: "f1" });
    assert.ok(salvo.id);
    assert.equal(salvo.faculdade_id, "f1");
    assert.equal(salvo.nome, "Computacao");
  });

  it("repassa a busca por id ao repositorio", async () => {
    const { service } = criar();
    assert.deepEqual(await service.buscarDepartamentoPorId("d9"), { id: "d9" });
  });

  it("lista todos os departamentos", async () => {
    const lista = [{ id: "d1" }];
    const { service } = criar({ listarDepartamentos: async () => lista });
    assert.deepEqual(await service.listarDepartamentos(), lista);
  });
});
