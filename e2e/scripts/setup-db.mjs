// Aplica migrations e seeds essenciais no banco E2E (spec §5.1, §16).
// Usa o knex do backend, apontando para o banco _e2e via DATABASE_URL.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(dir, "../../backend");

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/projeto_integrador_e2e";

if (!/(_e2e|_test)$/.test(new URL(databaseUrl).pathname.replace(/^\//, ""))) {
  console.error("Recusando: o banco alvo deve terminar em _e2e ou _test (spec §5.1).");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: databaseUrl, TZ: "America/Sao_Paulo" };
const knex = ["node", "-r", "ts-node/register", "node_modules/knex/bin/cli.js"];

function run(args, label) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(knex[0], [...knex.slice(1), ...args], {
    cwd: backendDir,
    env,
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) {
    console.error(`Falha em: ${label}`);
    process.exit(r.status ?? 1);
  }
}

run(["migrate:latest", "--knexfile", "knexfile.ts"], "migrations");
run(["seed:run", "--knexfile", "knexfile.ts", "--specific=cidades.ts"], "seed cidades");
run(["seed:run", "--knexfile", "knexfile.ts", "--specific=usuario_inicial.ts"], "seed usuário secretaria");
console.log("\n✔ Banco E2E pronto.");
