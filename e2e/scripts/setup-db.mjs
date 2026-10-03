// Aplica migrations e seeds essenciais no banco E2E (spec §5.1, §16).
// Usa o knex do backend, apontando para o banco _e2e via DATABASE_URL.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const dir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(dir, "../../backend");
const require = createRequire(path.join(backendDir, "package.json"));
require("ts-node").register({ project: path.join(backendDir, "tsconfig.json") });
const { configurarAmbienteTeste } = require(path.join(backendDir, "src/config/ambienteTeste.ts"));

if (process.env.ACADEMICO_MODO_TESTE !== "true") {
  throw new Error("A entrada E2E exige ACADEMICO_MODO_TESTE=true explícito.");
}

const databaseUrl =
  process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  TZ: "America/Sao_Paulo",
};
configurarAmbienteTeste(env);
// O knexfile existente não exporta test; a CLI deve selecionar development.
env.NODE_ENV = "development";

const knex = [process.execPath, "-r", "ts-node/register", "node_modules/knex/bin/cli.js"];

function run(args, label) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(knex[0], [...knex.slice(1), ...args, "--env", "development"], {
    cwd: backendDir,
    env,
    stdio: "inherit",
    windowsHide: true,
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
