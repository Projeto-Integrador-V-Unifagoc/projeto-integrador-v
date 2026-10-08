import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
const raizE2e = path.resolve(__dirname, "../../../e2e");
const importar = (arquivo: string) => import(path.join(raizE2e, `${arquivo}.ts`));

const f = vi.hoisted(() => ({ knex: vi.fn(), query: vi.fn(), iniciarPg: vi.fn(), destino: "127.0.0.1" }));
vi.mock("./pgIntegration", () => ({ startPgIntegration: f.iniciarPg }));
vi.mock("../../../e2e/node_modules/knex/knex.js", () => ({ default: f.knex }));
vi.mock("knex", () => ({ default: f.knex }));
let ambiente: NodeJS.ProcessEnv;
beforeEach(() => {
  ambiente = { ...process.env };
  Object.assign(process.env, { ACADEMICO_MODO_TESTE: "true", NODE_ENV: "test",
    E2E_DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:5433/academico_e2e",
    E2E_API_URL: "http://127.0.0.1:3101", E2E_WEB_URL: "http://127.0.0.1:5174" });
  f.destino = "127.0.0.1"; f.query.mockReset(); f.knex.mockReset();
  f.iniciarPg.mockReset().mockRejectedValue(new Error("INICIO_PG_INDEVIDO"));
  f.knex.mockImplementation((opcoes) => Object.assign(f.query, {
    client: { config: opcoes, connectionSettings: { host: f.destino, database: "academico_e2e", port: 5433 } },
    destroy: vi.fn().mockResolvedValue(undefined),
  }));
  vi.resetModules();
});
afterEach(() => { process.env = ambiente; vi.resetModules(); });

describe("destinos E2E sintéticos", () => {
  it.each([undefined, "false", "1"])("exige flag literal true (%s)", async (flag) => {
    if (flag === undefined) delete process.env.ACADEMICO_MODO_TESTE;
    else process.env.ACADEMICO_MODO_TESTE = flag;
    await expect(importar("helpers/config")).rejects.toThrow();
    expect(f.knex).not.toHaveBeenCalled();
  });
  it("recusa produção", async () => {
    process.env.NODE_ENV = "production";
    await expect(importar("helpers/config")).rejects.toThrow();
  });
  it.each(["E2E_API_URL", "E2E_WEB_URL"])("recusa %s externo antes de HTTP/browser", async (chave) => {
    process.env[chave] = "https://externo.invalid";
    await expect(importar("helpers/config")).rejects.toThrow();
  });
  it("recusa banco externo antes de instanciar Knex", async () => {
    process.env.E2E_DATABASE_URL = "postgresql://fixture:fixture@externo.invalid/academico_e2e";
    await expect(importar("helpers/db")).rejects.toThrow();
    expect(f.knex).not.toHaveBeenCalled();
  });
  it("recusa destino efetivo Knex externo antes de consultar", async () => {
    f.destino = "externo.invalid";
    const { db } = await importar("helpers/db");
    expect(() => db()).toThrow(); expect(f.query).not.toHaveBeenCalled();
  });
  it("revalida a flag antes de reutilizar o pool", async () => {
    const { db } = await importar("helpers/db");
    db(); process.env.ACADEMICO_MODO_TESTE = "false";
    expect(() => db()).toThrow(); expect(f.query).not.toHaveBeenCalled();
  });
  it.each(["https://externo.invalid/notas", "//externo.invalid/notas", "file:///notas"])(
    "recusa URL absoluta externa %s sem fetch", async (url) => {
      const fetch = vi.fn();
      const { Api } = await importar("helpers/api");
      await expect(new Api({ fetch } as any).get(url)).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    });
  it("aceita API própria loopback e preserva a base ao trocar token", async () => {
    const fetch = vi.fn().mockResolvedValue({ text: async () => "{}", status: () => 200,
      ok: () => true, headers: () => ({}) });
    const { Api } = await importar("helpers/api");
    const api = new Api({ fetch } as any, null, "http://127.0.0.1:43123").comToken("token-sintetico");
    await api.get("/notas", { query: { id: "a" } });
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:43123/notas?id=a", expect.objectContaining({
      headers: { Authorization: "Bearer token-sintetico" } }));
    expect(fetch.mock.calls[0][1].maxRedirects).toBe(0);
  });
  it("não usa banco padrão quando falta destino explícito", async () => {
    delete process.env.E2E_DATABASE_URL; delete process.env.DATABASE_URL;
    await expect(importar("helpers/config")).rejects.toThrow();
    expect(f.knex).not.toHaveBeenCalled();
  });
  it("teardown só fecha o pool e não consulta ou apaga", async () => {
    const { db } = await importar("helpers/db");
    const banco = db();
    await (await importar("global-teardown")).default();
    expect(banco.destroy).toHaveBeenCalledOnce(); expect(f.query).not.toHaveBeenCalled();
  });
  it("fixture de lote rejeita números em vez de escondê-los por coerção", async () => {
    const put = vi.fn();
    const { lancarNotaLote } = await importar("helpers/dominio");
    await expect(lancarNotaLote({ put }, "avaliacao", [{ alunoId: "aluno", valor: 0 }])).rejects.toThrow();
    expect(put).not.toHaveBeenCalled();
  });
  it("fixture histórica revalida a flag antes de provisionar seu PostgreSQL", async () => {
    const { iniciarHistoricoApi } = await importar("fixtures/historico.fixture");
    process.env.ACADEMICO_MODO_TESTE = "false";
    await expect(iniciarHistoricoApi()).rejects.toThrow(/ACADEMICO_MODO_TESTE=true/);
    expect(f.iniciarPg).not.toHaveBeenCalled();
  });
});
