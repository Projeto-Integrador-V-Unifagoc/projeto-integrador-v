import knex, { type Knex } from "knex";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validarDestinoPreflight, validarDestinoRetorno } from "./destino";
import { interpretarArgumentosPreflight } from "./preflight";

const referencia = "27be0d9c5306eda581d3aacffa1028b2671424b5";
const bancos: Knex[] = [];
const criar = (connection = "postgresql://fixture:fixture@127.0.0.1:9/preflight_test") => {
  const db = knex({ client: "pg", connection, pool: { min: 0, max: 1 } }); bancos.push(db);
  const consultar = vi.fn(() => { throw new Error("SQL proibido nesta unidade."); });
  vi.spyOn(db, "transaction").mockImplementation(consultar);
  return { db, consultar };
};
afterEach(async () => { vi.unstubAllEnvs(); for (const db of bancos.splice(0)) await db.destroy(); });

describe("seleção explícita de destino técnico, antes de SQL", () => {
  it.each(["false", "TRUE", "1", ""])("recusa flag sintética não literal %s sem seleção de ambiente real", (flag) => {
    vi.stubEnv("ACADEMICO_MODO_TESTE", flag); const { db, consultar } = criar();
    expect(() => validarDestinoPreflight(db)).toThrow(); expect(() => validarDestinoRetorno(db)).toThrow();
    expect(consultar).not.toHaveBeenCalled();
  });
  it.each(["postgresql://fixture:fixture@remoto.example.test/preflight_test", "postgresql://fixture:fixture@127.0.0.1:9/projeto"])(
    "recusa host externo ou banco sem sufixo no modo sintético", (url) => {
      vi.stubEnv("ACADEMICO_MODO_TESTE", "true"); const { db, consultar } = criar(url);
      expect(() => validarDestinoPreflight(db)).toThrow(); expect(consultar).not.toHaveBeenCalled();
    });
  it("recusa destino efetivo divergente e transação já aberta", () => {
    vi.stubEnv("ACADEMICO_MODO_TESTE", "true"); const { db } = criar();
    db.client.connectionSettings.host = "remoto.example.test";
    expect(() => validarDestinoPreflight(db)).toThrow();
    expect(() => validarDestinoPreflight({ ...db, isTransaction: true } as any)).toThrow();
  });
  it("normal exige nome de variável selecionado e confere conexão efetiva, sem consultar", () => {
    vi.stubEnv("ACADEMICO_MODO_TESTE", undefined);
    vi.stubEnv("PREFLIGHT_DESTINO_EXPLICITO", "postgresql://fixture:fixture@127.0.0.1:9/ambiente_sintetico");
    const { db, consultar } = criar(process.env.PREFLIGHT_DESTINO_EXPLICITO);
    expect(() => validarDestinoPreflight(db, { ambiente: "homologacao", variavelDestino: "PREFLIGHT_DESTINO_EXPLICITO" })).not.toThrow();
    expect(() => validarDestinoPreflight(db, { ambiente: "homologacao" })).toThrow();
    db.client.connectionSettings.database = "outro_banco";
    expect(() => validarDestinoPreflight(db, { ambiente: "homologacao", variavelDestino: "PREFLIGHT_DESTINO_EXPLICITO" })).toThrow();
    expect(consultar).not.toHaveBeenCalled();
  });
  it("CLI admite apenas três escolhas explícitas e nunca URL ou senha como argumento", () => {
    expect(interpretarArgumentosPreflight(["--ambiente", "teste", "--destino-env", "PREFLIGHT_DB", "--referencia-codigo", referencia]))
      .toEqual({ ambiente: "teste", variavelDestino: "PREFLIGHT_DB", referenciaCodigo: referencia });
    expect(() => interpretarArgumentosPreflight([])).toThrow();
    expect(() => interpretarArgumentosPreflight(["--ambiente", "teste", "--destino-env", "postgresql://senha", "--referencia-codigo", referencia])).toThrow();
    expect(() => interpretarArgumentosPreflight(["--ambiente", "teste", "--ambiente", "producao", "--referencia-codigo", referencia])).toThrow();
  });
});
