import { configurarAmbienteTeste, validarBancoTeste } from "../../backend/src/config/ambienteTeste";
import { exigirModoSintetico, validarUrlHttpTeste } from "./isolamento.js";

const databaseUrl = validarBancoTeste(process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL);

exigirModoSintetico();
configurarAmbienteTeste({
  ...process.env,
  DATABASE_URL: databaseUrl,
});

/**
 * Configuração central da suíte E2E, derivada de variáveis de ambiente com
 * valores padrão para o ambiente local isolado (docker-compose.e2e.yml +
 * backend na porta 3100). Centralizar aqui evita literais espalhados pelos
 * specs e mantém a execução reproduzível (spec §4, §5).
 */
export const config = {
  apiUrl: validarUrlHttpTeste(process.env.E2E_API_URL ?? "http://localhost:3100"),
  webUrl: process.env.E2E_WEB_URL ? validarUrlHttpTeste(process.env.E2E_WEB_URL) : "",
  databaseUrl,
  secretaria: {
    email: process.env.E2E_SECRETARIA_EMAIL ?? "suporte@unieduca.com.br",
    senha: process.env.E2E_SECRETARIA_SENHA ?? "unieduca2026",
  },
  uploadDir: process.env.E2E_UPLOAD_DIR ?? "",
  /** Timezone exigido pela spec (§5.1) para datas acadêmicas determinísticas. */
  timezone: "America/Sao_Paulo",
} as const;

/** Os testes de UI só rodam quando há um frontend apontado para o backend E2E. */
export const uiEnabled = config.webUrl.length > 0;
