import { spawnSync } from "node:child_process";
import path from "node:path";
import knexLib, { type Knex } from "knex";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

/**
 * Sobe um Postgres efêmero (Testcontainers), aplica migrations + seeds essenciais
 * e devolve uma conexão knex para asserções/limpeza.
 *
 * Requer Docker em execução na máquina/CI. As migrations `.ts` são aplicadas pelo
 * mesmo comando do projeto (`knex` + `ts-node/register` + `knexfile.ts`), igual ao
 * `e2e/scripts/setup-db.mjs`, para não depender do pipeline de transform do Vitest.
 *
 * IMPORTANTE: `startPgIntegration()` define `process.env.DATABASE_URL`. Só importe
 * `src/app.ts` (ou qualquer coisa que puxe `src/database/connection.ts`) DEPOIS
 * de aguardar esta função, pois a conexão é resolvida no import.
 */

const backendDir = path.resolve(__dirname, "..", "..");

export interface PgIntegration {
  container: StartedPostgreSqlContainer;
  db: Knex;
  databaseUrl: string;
  stop(): Promise<void>;
}

function knexCli(args: string[], databaseUrl: string, label: string): void {
  const resultado = spawnSync(
    "node",
    [
      "-r",
      "ts-node/register",
      "node_modules/knex/bin/cli.js",
      ...args,
      "--knexfile",
      "knexfile.ts",
    ],
    {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL: databaseUrl, TZ: "America/Sao_Paulo" },
      stdio: "inherit",
      shell: true,
    },
  );
  if (resultado.status !== 0) {
    throw new Error(`knex ${label} falhou (exit ${resultado.status ?? "signal"})`);
  }
}

export async function startPgIntegration(): Promise<PgIntegration> {
  const container = await new PostgreSqlContainer("postgres:15")
    // Nome termina em `_test`: mantém a trava de segurança do e2e/setup-db.mjs.
    .withDatabase("projeto_integrador_test")
    .start();

  const databaseUrl = container.getConnectionUri();

  // Precisa valer ANTES de qualquer import de src/database/connection.ts.
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(40);
  process.env.TZ = "America/Sao_Paulo";

  knexCli(["migrate:latest"], databaseUrl, "migrate:latest");
  knexCli(["seed:run", "--specific=cidades.ts"], databaseUrl, "seed cidades");
  knexCli(["seed:run", "--specific=usuario_inicial.ts"], databaseUrl, "seed usuario_inicial");

  const db = knexLib({
    client: "pg",
    connection: databaseUrl,
    searchPath: ["piv", "public"],
  });

  return {
    container,
    db,
    databaseUrl,
    async stop() {
      await db.destroy();
      await container.stop();
    },
  };
}
