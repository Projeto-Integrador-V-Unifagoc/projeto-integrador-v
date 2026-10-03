import type { Knex } from "knex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const URL_ISOLADA = "postgresql://fixture:fixture@127.0.0.1:9/historico_fixture_test";
const DESTINO_ISOLADO = { host: "127.0.0.1", port: 9, database: "historico_fixture_test" };

beforeEach(() => {
  // Cada caso começa com uma instância independente do modo confirmado.
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ACADEMICO_MODO_TESTE", "true");
  vi.stubEnv("DATABASE_URL", URL_ISOLADA);
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

function executorSemSql(conexao: unknown, efetiva: unknown = DESTINO_ISOLADO, client = "pg") {
  const sql = vi.fn(() => { throw new Error("SQL não deveria ser executado."); });
  const raw = vi.fn(() => { throw new Error("SQL raw não deveria ser executado."); });
  const transaction = vi.fn(() => { throw new Error("Transação não deveria ser aberta."); });
  const db = Object.assign(sql, { raw, transaction, client: {
    config: { client, connection: conexao }, connectionSettings: efetiva,
  } }) as unknown as Knex;
  return { db, sql, raw, transaction };
}

describe("guarda do executor real antes de inserir histórico sintético", () => {
  it.each([
    ["host remoto na configuração", "postgresql://fixture:fixture@db.example.test/historico_fixture_test", DESTINO_ISOLADO, /localhost/],
    ["host remoto efetivo", URL_ISOLADA, { ...DESTINO_ISOLADO, host: "db.example.test" }, /localhost/],
    ["banco sem sufixo na configuração", "postgresql://fixture:fixture@127.0.0.1:9/historico", DESTINO_ISOLADO, /terminar em/],
    ["banco efetivo sem sufixo", URL_ISOLADA, { ...DESTINO_ISOLADO, database: "historico" }, /terminar em/],
    ["override de host na URL", `${URL_ISOLADA}?host=db.example.test`, DESTINO_ISOLADO, /parâmetros/],
    ["connectionString no objeto", { ...DESTINO_ISOLADO, connectionString: "postgresql://fixture:fixture@db.example.test/historico_fixture_test" }, DESTINO_ISOLADO, /sobrescrever/],
    ["options na conexão efetiva", URL_ISOLADA, { ...DESTINO_ISOLADO, options: "-c search_path=public" }, /sobrescrever/],
  ])("recusa %s mesmo com DATABASE_URL de ambiente isolada", async (_cenario, conexao, efetiva, mensagem) => {
    const { criarHistoricoPontuacao } = await import("./historicoPontuacao");
    const sentinela = executorSemSql(conexao, efetiva);
    await expect(criarHistoricoPontuacao(sentinela.db, "completo")).rejects.toThrow(mensagem as RegExp);
    expect(sentinela.sql).not.toHaveBeenCalled();
    expect(sentinela.raw).not.toHaveBeenCalled();
    expect(sentinela.transaction).not.toHaveBeenCalled();
  });

  it("recusa modo false antes de qualquer SQL ou transação", async () => {
    vi.stubEnv("ACADEMICO_MODO_TESTE", "false");
    const { criarHistoricoPontuacao } = await import("./historicoPontuacao");
    const sentinela = executorSemSql(URL_ISOLADA);
    await expect(criarHistoricoPontuacao(sentinela.db, "completo")).rejects.toThrow(/MODO_TESTE|modo explícito/);
    expect(sentinela.sql).not.toHaveBeenCalled();
    expect(sentinela.raw).not.toHaveBeenCalled();
    expect(sentinela.transaction).not.toHaveBeenCalled();
  });

  it("recusa executor de outro driver antes de SQL", async () => {
    const { criarHistoricoPontuacao } = await import("./historicoPontuacao");
    const sentinela = executorSemSql(URL_ISOLADA, DESTINO_ISOLADO, "mysql2");
    await expect(criarHistoricoPontuacao(sentinela.db, "completo")).rejects.toThrow(/PostgreSQL/);
    expect(sentinela.sql).not.toHaveBeenCalled();
    expect(sentinela.raw).not.toHaveBeenCalled();
    expect(sentinela.transaction).not.toHaveBeenCalled();
  });

  it("recusa false mesmo após o modo de teste ter sido confirmado no processo", async () => {
    const { validarDestinoPostgresTeste } = await import("./disputaAcademica");
    const { criarHistoricoPontuacao } = await import("./historicoPontuacao");
    const sentinela = executorSemSql(URL_ISOLADA);
    validarDestinoPostgresTeste(sentinela.db);
    vi.stubEnv("ACADEMICO_MODO_TESTE", "false");
    await expect(criarHistoricoPontuacao(sentinela.db, "completo")).rejects.toThrow(/MODO_TESTE|modo explícito/);
    expect(sentinela.sql).not.toHaveBeenCalled();
    expect(sentinela.raw).not.toHaveBeenCalled();
    expect(sentinela.transaction).not.toHaveBeenCalled();
  });
});
