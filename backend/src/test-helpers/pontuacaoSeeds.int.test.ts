import { createHash } from "node:crypto";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPgIntegration, type PgIntegration } from "./pgIntegration";
import { seed as relatorios } from "../../seeds/20260621000100_relatorios_academicos_demo";
import { seed as auditoria } from "../../seeds/20260627000100_dados_auditoria";

let pg: PgIntegration;
let helpers: any;
beforeAll(async () => { pg = await startPgIntegration(); });
afterAll(async () => { await helpers?.fecharDb(); await pg?.stop(); });
async function manifesto() {
  const tabelas = await pg.db("pg_tables").where({ schemaname: "piv" }).select("tablename").orderBy("tablename");
  const registros: Record<string, string> = {};
  for (const { tablename } of tabelas) {
    const linhas = await pg.db(`piv.${tablename}`).select("*");
    registros[tablename] = createHash("sha256").update(JSON.stringify(linhas.map((r) => JSON.stringify(r)).sort())).digest("hex");
  }
  return registros;
}
describe("demos novos com guards ativos", () => {
  it("setup exige base vazia sem excluir dados e inventaria as novas tabelas", async () => {
    process.env.E2E_DATABASE_URL = pg.databaseUrl;
    helpers = await import(path.resolve(__dirname, "../../../e2e/helpers/db.ts"));
    expect(helpers.TABELAS_DADOS).toEqual(expect.arrayContaining(["regra_pontuacao", "subgrupo_avaliacao", "regra_pontuacao_auditoria"]));
    await helpers.exigirBaseVazia();
  });
  it.each([["relatorios", relatorios, "120.00"], ["auditoria", auditoria, "100.00"]] as const)(
    "%s configura explicitamente e repetição preserva todos os registros", async (_nome, seed, total) => {
      await seed(pg.db);
      const regras = await pg.db("piv.regra_pontuacao").where({ total_pontos: total });
      expect(regras.length).toBeGreaterThan(0); expect(regras.every((r) => r.origem === "CONFIGURADA")).toBe(true);
      const avaliacoes = await pg.db("piv.avaliacao as a").join("piv.turma_disciplina as td", "td.id", "a.turma_disciplina_id")
        .whereIn("td.regra_pontuacao_id", regras.map((r) => r.id)).select("a.*");
      expect(avaliacoes.every((a) => a.tipo_avaliacao === "RECUPERACAO"
        ? a.subgrupo_id === null && a.valor === total : a.tipo_avaliacao === "REGULAR" && !!a.subgrupo_id)).toBe(true);
      const antes = await manifesto(); await seed(pg.db); expect(await manifesto()).toEqual(antes);
      await expect(helpers.exigirBaseVazia()).rejects.toThrow(/base sem grafos/i);
      expect(await manifesto()).toEqual(antes);
      const { rows } = await pg.db.raw("SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname='pontuacao_guard_auditoria' AND tgenabled='O'");
      expect(rows.length).toBeGreaterThanOrEqual(2);
    }, 30000);
  it("auditoria tem perfil real e cadeia de valor/tempo coerente", async () => {
    const eventos = await pg.db("piv.nota_auditoria as na").join("piv.usuario as u", "u.id", "na.usuario_id")
      .join("piv.nota as n", "n.id", "na.nota_id").select("na.*", "u.tipo_usuario", "n.publicada_em").orderBy(["na.nota_id", "na.criado_em", "na.id"]);
    expect(eventos.length).toBeGreaterThan(0);
    const anteriores = new Map<string, string>();
    for (const e of eventos) {
      expect(e.perfil).toBe(e.tipo_usuario);
      expect(new Date(e.criado_em).getTime()).toBeGreaterThanOrEqual(new Date(e.publicada_em).getTime());
      if (e.acao === "LANCAMENTO") expect(e.valor_anterior).toBeNull();
      else expect(e.valor_anterior).toBe(anteriores.get(e.nota_id));
      anteriores.set(e.nota_id, e.valor_novo);
    }
  });
});
