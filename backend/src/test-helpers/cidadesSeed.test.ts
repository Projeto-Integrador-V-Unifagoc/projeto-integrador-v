import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("axios", () => ({ default: { get } }));
let ambiente: NodeJS.ProcessEnv;
beforeEach(() => {
  ambiente = { ...process.env };
  process.env.ACADEMICO_MODO_TESTE = "true";
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://fixture:fixture@127.0.0.1:5433/cidades_test";
  get.mockReset();
  vi.resetModules();
});
afterEach(() => { process.env = ambiente; vi.resetModules(); });

function escritor() {
  const merge = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn((linhas: unknown[]) => ({ onConflict: () => ({ merge }) }));
  const db = Object.assign(vi.fn(() => ({ insert })), {
    client: { config: { client: "pg", connection: process.env.DATABASE_URL },
      connectionSettings: { host: "127.0.0.1", database: "cidades_test", port: 5433 } },
  });
  return { db: db as unknown as Knex, insert, merge };
}

describe("seed de cidades isolado", () => {
  it("usa o JSON local em teste sem consultar o IBGE", async () => {
    const f = escritor();
    await (await import("../../seeds/cidades")).seed(f.db);
    expect(get).not.toHaveBeenCalled();
    expect(f.insert).toHaveBeenCalled();
    expect(f.insert.mock.calls.flatMap(([linhas]) => linhas)).toHaveLength(5571);
  });
  it("recusa produção antes de rede ou escrita", async () => {
    process.env.NODE_ENV = "production";
    const f = escritor();
    await expect((await import("../../seeds/cidades")).seed(f.db)).rejects.toThrow(/produ/i);
    expect(get).not.toHaveBeenCalled(); expect(f.insert).not.toHaveBeenCalled();
  });
  it("recusa destino externo em teste antes de rede ou escrita", async () => {
    process.env.DATABASE_URL = "postgresql://fixture:fixture@externo.invalid/cidades_test";
    const f = escritor();
    await expect((await import("../../seeds/cidades")).seed(f.db)).rejects.toThrow();
    expect(get).not.toHaveBeenCalled(); expect(f.insert).not.toHaveBeenCalled();
  });
  it("preserva consulta e fallback local no modo normal", async () => {
    process.env.ACADEMICO_MODO_TESTE = "false";
    get.mockRejectedValue(new Error("indisponibilidade sintética"));
    const f = escritor();
    await (await import("../../seeds/cidades")).seed(f.db);
    expect(get).toHaveBeenCalledTimes(1); expect(f.insert).toHaveBeenCalled();
  });
});
