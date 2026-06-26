// Sobe uma instância isolada do backend apontada para o banco E2E (porta 3100).
// Reprodutível em local e CI (spec §16). Não contém segredos de produção.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(dir, "../../backend");

const env = {
  ...process.env,
  PORT: process.env.E2E_BACKEND_PORT ?? "3100",
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5433/projeto_integrador_e2e",
  // Segredo de teste (>= 32 chars). Override via E2E_JWT_SECRET se necessário.
  JWT_SECRET: process.env.E2E_JWT_SECRET ?? "e2e-jwt-secret-only-for-tests-0123456789",
  TZ: "America/Sao_Paulo",
  UPLOAD_DIR: process.env.E2E_UPLOAD_DIR ?? path.resolve(dir, "../.tmp-uploads"),
};

const filho = spawn("npx", ["tsx", "src/app.ts"], {
  cwd: backendDir,
  env,
  stdio: "inherit",
  shell: true,
});

filho.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => filho.kill("SIGINT"));
process.on("SIGTERM", () => filho.kill("SIGTERM"));
