import { spawnSync } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPgIntegration, type PgIntegration } from "./pgIntegration";

const backendDir = path.resolve(__dirname, "../..");
const cursoDemoId = "12000000-0000-4000-8000-000000000003";
let pg: PgIntegration;

beforeAll(async () => {
  pg = await startPgIntegration({ semSeedsEssenciais: true });
});

afterAll(async () => {
  await pg?.stop();
});

describe("seed completo em banco recém-migrado", () => {
  it("cria a secretaria antes da demo de relatórios e permite repetir o lote", async () => {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const resultado = spawnSync(
        process.execPath,
        ["-r", "ts-node/register", "node_modules/knex/bin/cli.js", "seed:run", "--knexfile", "knexfile.ts", "--env", "development"],
        {
          cwd: backendDir,
          env: {
            ...process.env,
            ACADEMICO_MODO_TESTE: "true",
            EMAIL_MODO_TESTE: "true",
            NODE_ENV: "development",
            DATABASE_URL: pg.databaseUrl,
            TZ: "America/Sao_Paulo",
          },
          encoding: "utf8",
          timeout: 120000,
        },
      );
      const saida = `${resultado.stdout ?? ""}\n${resultado.stderr ?? ""}`
        .replaceAll(pg.databaseUrl, "<REDACTED>");
      expect(resultado.status, saida).toBe(0);
    }

    const secretaria = await pg.db("piv.usuario").where({ tipo_usuario: "secretaria" }).first("id");
    const cursoDemo = await pg.db("piv.curso").where({ id: cursoDemoId }).first("id");
    expect(secretaria).toBeDefined();
    expect(cursoDemo).toBeDefined();
  }, 120000);
});
