import { spawnSync } from "node:child_process";
import path from "node:path";
import knexLib, { type Knex } from "knex";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { configurarAmbienteTeste, estaEmModoTeste } from "../config/ambienteTeste";

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

export interface OpcoesPgIntegration {
  /** Schema antigo, antes de inserir o histórico artificial da adoção. */
  fronteiraHistorica?: boolean;
  /** Schema expandido sem adoção/guards, para incompatibilidades de precisão sintéticas. */
  fronteiraExpandida?: boolean;
}

function knexCli(args: string[], databaseUrl: string, label: string, fronteira?: "historica" | "expandida"): void {
  const resultado = spawnSync(
    process.execPath,
    [
      "-r",
      "ts-node/register",
      ...(fronteira ? ["src/test-helpers/migrarFronteira.ts", fronteira]
        : ["node_modules/knex/bin/cli.js", ...args, "--knexfile", "knexfile.ts", "--env", "development"]),
    ],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        ACADEMICO_MODO_TESTE: "true",
        NODE_ENV: "development",
        EMAIL_MODO_TESTE: "true",
        DATABASE_URL: databaseUrl,
        TZ: "America/Sao_Paulo",
      },
      stdio: "inherit",
    },
  );
  if (resultado.status !== 0) {
    throw new Error(`knex ${label} falhou (exit ${resultado.status ?? "signal"})`);
  }
}

export async function startPgIntegration(opcoes: OpcoesPgIntegration = {}): Promise<PgIntegration> {
  if (opcoes.fronteiraHistorica && opcoes.fronteiraExpandida) throw new TypeError("Selecione uma única fronteira de teste.");
  process.env.ACADEMICO_MODO_TESTE = "true";
  // Rejeita produção antes de iniciar o container, sem substituir NODE_ENV.
  estaEmModoTeste();
  const container = await new PostgreSqlContainer("postgres:15")
    // Nome termina em `_test`: mantém a trava de segurança do e2e/setup-db.mjs.
    .withDatabase("projeto_integrador_test")
    .start();

  try {
    const databaseUrl = container.getConnectionUri();

    // Precisa valer ANTES de qualquer import de src/database/connection.ts.
    process.env.DATABASE_URL = databaseUrl;
    configurarAmbienteTeste();
    process.env.JWT_SECRET = "integration-jwt-secret-only-for-tests-0123456789";
    process.env.TZ = "America/Sao_Paulo";

    const fronteira = opcoes.fronteiraHistorica ? "historica" : opcoes.fronteiraExpandida ? "expandida" : undefined;
    knexCli(["migrate:latest"], databaseUrl, "migrate:latest", fronteira);
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
        try { await db.destroy(); } finally { await container.stop(); }
      },
    };
  } catch (erro) {
    await container.stop();
    throw erro;
  }
}
