import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { PeriodoLetivoService } from "./PeriodoLetivoService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    buscarPeriodoLetivoPorCodigo: async (_c: string) => null,
    buscarPeriodoLetivoPorAnoSemestre: async (_a: number, _s: number) => null,
    buscarPeriodoLetivoPorId: async (_id: string) => ({
      id: "p1", codigo: "2026/1", ano: 2026, semestre: 1,
      data_inicio: "2026-02-01", data_fim: "2026-06-30", ativo: true, status: "planejado",
    }),
    criarPeriodoLetivo: async (data: any) => data,
    listarPeriodosLetivos: async () => [],
    atualizarPeriodoLetivo: async (_id: string, data: any) => data,
    removerPeriodoLetivo: async (_id: string) => 1,
    ...overrides,
  };
  const service = new PeriodoLetivoService();
  service.periodoLetivoRepository = repository as any;
  return { service, repository };
}

const baseInput = {
  codigo: "2026/1", ano: 2026, semestre: 1,
  dataInicio: "2026-02-01", dataFim: "2026-06-30",
};

describe("PeriodoLetivoService.criarPeriodoLetivo", () => {
  it("cria periodo valido com id e defaults", async () => {
    let salvo: any;
    const { service } = criar({ criarPeriodoLetivo: async (d: any) => ((salvo = d), d) });
    await service.criarPeriodoLetivo({ ...baseInput });
    assert.ok(salvo.id);
    assert.equal(salvo.ativo, true);
    assert.equal(salvo.status, "planejado");
  });

  it("rejeita semestre diferente de 1 ou 2", async () => {
    const { service } = criar();
    await assert.rejects(() => service.criarPeriodoLetivo({ ...baseInput, semestre: 3 }), /Semestre deve ser 1 ou 2/);
  });

  it("rejeita data fim anterior a data inicio", async () => {
    const { service } = criar();
    await assert.rejects(
      () => service.criarPeriodoLetivo({ ...baseInput, dataInicio: "2026-06-30", dataFim: "2026-02-01" }),
      /Data fim deve ser maior/,
    );
  });

  it("rejeita codigo duplicado", async () => {
    const { service } = criar({ buscarPeriodoLetivoPorCodigo: async () => ({ id: "outro" }) });
    await assert.rejects(() => service.criarPeriodoLetivo({ ...baseInput }), /Ja existe periodo letivo com este codigo/);
  });

  it("rejeita ano/semestre ja cadastrado", async () => {
    const { service } = criar({ buscarPeriodoLetivoPorAnoSemestre: async () => ({ id: "outro" }) });
    await assert.rejects(() => service.criarPeriodoLetivo({ ...baseInput }), /para este ano e semestre/);
  });
});

describe("PeriodoLetivoService.atualizarPeriodoLetivo", () => {
  it("retorna null quando o periodo nao existe", async () => {
    const { service } = criar({ buscarPeriodoLetivoPorId: async () => null });
    assert.equal(await service.atualizarPeriodoLetivo("x", {}), null);
  });

  it("valida o payload combinado (atual + alteracoes)", async () => {
    const { service } = criar();
    await assert.rejects(() => service.atualizarPeriodoLetivo("p1", { semestre: 9 }), /Semestre deve ser 1 ou 2/);
  });

  it("rejeita novo codigo ja usado por outro periodo", async () => {
    const { service } = criar({ buscarPeriodoLetivoPorCodigo: async () => ({ id: "outro" }) });
    await assert.rejects(() => service.atualizarPeriodoLetivo("p1", { codigo: "2026/2" }), /Ja existe periodo letivo com este codigo/);
  });

  it("nao valida codigo quando ele nao muda", async () => {
    let chamouBuscaPorCodigo = false;
    const { service } = criar({ buscarPeriodoLetivoPorCodigo: async () => { chamouBuscaPorCodigo = true; return null; } });
    await service.atualizarPeriodoLetivo("p1", { codigo: "2026/1" });
    assert.equal(chamouBuscaPorCodigo, false);
  });

  it("rejeita novo ano/semestre ja cadastrado para outro periodo", async () => {
    const { service } = criar({ buscarPeriodoLetivoPorAnoSemestre: async () => ({ id: "outro" }) });
    await assert.rejects(() => service.atualizarPeriodoLetivo("p1", { semestre: 2 }), /para este ano e semestre/);
  });

  it("nao valida ano/semestre quando nao mudam", async () => {
    let chamouBuscaPorAnoSemestre = false;
    const { service } = criar({ buscarPeriodoLetivoPorAnoSemestre: async () => { chamouBuscaPorAnoSemestre = true; return null; } });
    await service.atualizarPeriodoLetivo("p1", { codigo: "2026/1" });
    assert.equal(chamouBuscaPorAnoSemestre, false);
  });

  it("atualiza o periodo combinando dados atuais e alteracoes", async () => {
    let salvo: any;
    const { service } = criar({ atualizarPeriodoLetivo: async (_id: string, d: any) => ((salvo = d), d) });
    await service.atualizarPeriodoLetivo("p1", { status: "em_andamento" });
    assert.equal(salvo.codigo, "2026/1");
    assert.equal(salvo.status, "em_andamento");
  });
});

describe("PeriodoLetivoService leitura e remocao", () => {
  it("lista todos os periodos", async () => {
    const lista = [{ id: "p1" }];
    const { service } = criar({ listarPeriodosLetivos: async () => lista });
    assert.deepEqual(await service.listarPeriodosLetivos(), lista);
  });

  it("busca um periodo pelo id", async () => {
    const periodo = { id: "p1" };
    const { service } = criar({ buscarPeriodoLetivoPorId: async () => periodo as any });
    assert.deepEqual(await service.buscarPeriodoLetivoPorId("p1"), periodo);
  });

  it("remove um periodo pelo id", async () => {
    let idRemovido: string | undefined;
    const { service } = criar({ removerPeriodoLetivo: async (id: string) => { idRemovido = id; return 1; } });
    assert.equal(await service.removerPeriodoLetivo("p1"), 1);
    assert.equal(idRemovido, "p1");
  });
});
