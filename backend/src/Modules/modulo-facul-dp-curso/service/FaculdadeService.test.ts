import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { FaculdadeService } from "./FaculdadeService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    criarFaculdade: async (data: any) => data,
    listarFaculdades: async () => [],
    buscarFaculdadePorId: async (id: string) => ({ id }),
    ...overrides,
  };
  const service = new FaculdadeService();
  service.faculdadeRepository = repository as any;
  return { service, repository };
}

describe("FaculdadeService", () => {
  it("gera id e mapeia cidadeIbge para cidade_id ao criar", async () => {
    let salvo: any;
    const { service } = criar({ criarFaculdade: async (d: any) => ((salvo = d), d) });
    await service.criarFaculdade({
      nome: "Unifagoc", cidadeIbge: "3106200",
      logradouro: "Rua X", numero: "10", bairro: "Centro", cep: "35000-000",
    });
    assert.ok(salvo.id);
    assert.equal(salvo.cidade_id, "3106200");
    assert.equal(salvo.bairro, "Centro");
  });

  it("repassa a busca por id ao repositorio", async () => {
    const { service } = criar();
    assert.deepEqual(await service.buscarFaculdadePorId("f7"), { id: "f7" });
  });

  it("lista todas as faculdades", async () => {
    const lista = [{ id: "f1" }];
    const { service } = criar({ listarFaculdades: async () => lista });
    assert.deepEqual(await service.listarFaculdades(), lista);
  });
});
