import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MatrizCurricularService } from "./MatrizCurricularService";

function criar(overrides: Record<string, any> = {}) {
  const service = new MatrizCurricularService();
  service.cursoRepository = { buscarCursoRegistroPorId: async () => ({ id: "c1" }) } as any;
  service.repository = {
    listarPorCurso: async () => [],
    buscarPorId: async () => ({ id: "mc1", curso_id: "c1", status: "RASCUNHO" }),
    criar: async (data: any) => data,
    atualizar: async (_id: string, data: any) => data,
    publicar: async () => ({ id: "mc1", status: "VIGENTE" }),
    ...overrides,
  } as any;
  return service;
}

describe("MatrizCurricularService", () => {
  it("cria rascunho normalizando codigo e preservando a origem", async () => {
    let origem: string | undefined;
    const service = criar({ criar: async (data: any, matrizOrigemId: string) => ((origem = matrizOrigemId), data) });
    const resultado = await service.criar("c1", { codigo: " ads-2027 ", versao: "2027.1", vigenciaInicio: "2027-01-01", matrizOrigemId: "legado" });
    assert.equal(resultado.codigo, "ADS-2027");
    assert.equal(resultado.status, "RASCUNHO");
    assert.equal(origem, "legado");
  });

  it("rejeita data de vigencia invalida", async () => {
    await assert.rejects(() => criar().criar("c1", { codigo: "M1", versao: "1", vigenciaInicio: "01/01/2027" }), /vigencia invalida/i);
  });

  it("impede alterar matriz publicada", async () => {
    const service = criar({ buscarPorId: async () => ({ id: "mc1", status: "VIGENTE" }) });
    await assert.rejects(() => service.atualizar("mc1", { versao: "2" }), /rascunho/i);
  });

  it("publica delegando a confirmacao de encerramento", async () => {
    let confirmar = false;
    const service = criar({ publicar: async (_id: string, valor: boolean) => ((confirmar = valor), { status: "VIGENTE" }) });
    const resultado = await service.publicar("mc1", true);
    assert.equal(confirmar, true);
    assert.equal(resultado?.status, "VIGENTE");
  });
});
