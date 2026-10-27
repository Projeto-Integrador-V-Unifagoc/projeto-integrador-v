import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { CompetenciaService } from "./CompetenciaService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    buscarPorCodigo: async () => null,
    buscarPorId: async () => null,
    criar: async (data: any) => data,
    atualizar: async (_id: string, data: any) => data,
    possuiVinculos: async () => false,
    remover: async () => 1,
    listar: async () => [],
    ...overrides,
  };
  const service = new CompetenciaService();
  service.repository = repository as any;
  return service;
}

describe("CompetenciaService", () => {
  it("normaliza codigo e tipo", async () => {
    const item = await criar().criar({ codigo: " comp-1 ", nome: "Resolver problemas", descricao: "Aplica tecnicas", tipo: "tecnica" });
    assert.equal(item.codigo, "COMP-1");
    assert.equal(item.tipo, "TECNICA");
  });

  it("rejeita tipo invalido", async () => {
    await assert.rejects(() => criar().criar({ codigo: "C1", nome: "N", descricao: "D", tipo: "OUTRO" }), /tipo/i);
  });

  it("bloqueia exclusao de competencia vinculada", async () => {
    await assert.rejects(() => criar({ possuiVinculos: async () => true }).remover("c1"), /desative-a/i);
  });
});
