import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { CidadeService } from "./CidadeService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    listarCidades: async (_filtros?: any) => [{ ibge: "3106200", nome: "Belo Horizonte" }],
    buscarCidadePorIbge: async (_ibge: string) => ({ ibge: "3106200", nome: "Belo Horizonte" }),
    ...overrides,
  };
  const service = new CidadeService();
  (service as any).cidadeRepository = repository;
  return { service, repository };
}

describe("CidadeService", () => {
  it("repassa os filtros para o repositorio ao listar", async () => {
    let recebido: any;
    const { service } = criar({
      listarCidades: async (filtros: any) => {
        recebido = filtros;
        return [];
      },
    });
    await service.listarCidades({ nome: "belo" });
    assert.deepEqual(recebido, { nome: "belo" });
  });

  it("retorna a cidade encontrada pelo codigo ibge", async () => {
    const { service } = criar();
    const cidade = await service.buscarCidadePorIbge("3106200");
    assert.equal(cidade?.nome, "Belo Horizonte");
  });
});
