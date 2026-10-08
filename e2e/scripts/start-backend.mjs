// Sobe uma instância isolada do backend apontada para o banco E2E (porta 3100).
// Reprodutível em local e CI (spec §16). Não contém segredos de produção.
import { spawn } from "node:child_process";
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

const env = {
  ...process.env,
  NODE_ENV: "test",
  RECAPTCHA_BYPASS: "true",
  E2E_RATE_LIMIT_BYPASS: "true",
  PORT: process.env.E2E_BACKEND_PORT ?? "3100",
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL,
  // Segredo de teste (>= 32 chars). Override via E2E_JWT_SECRET se necessário.
  JWT_SECRET: process.env.E2E_JWT_SECRET ?? "e2e-jwt-secret-only-for-tests-0123456789",
  TZ: "America/Sao_Paulo",
  UPLOAD_DIR: process.env.E2E_UPLOAD_DIR ?? path.resolve(dir, "../.tmp-uploads"),
};
configurarAmbienteTeste(env);
env.NODE_ENV = "development";

const filho = spawn(process.execPath, [require.resolve("tsx/cli"), "src/app.ts"], {
  cwd: backendDir,
  env,
  stdio: "inherit",
  windowsHide: true,
});

filho.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => filho.kill("SIGINT"));
process.on("SIGTERM", () => filho.kill("SIGTERM"));
