import { request } from "@playwright/test";
import { config } from "./helpers/config.js";
import { exigirBancoDeTeste, limparBanco, fecharDb } from "./helpers/db.js";

/**
 * Pré-condições da suíte (spec §5, §16):
 *  - confirma que o banco alvo é um banco de teste (_e2e/_test);
 *  - verifica a saúde do backend e o login da secretaria;
 *  - parte de um estado limpo para garantir execução repetível.
 */
export default async function globalSetup() {
  exigirBancoDeTeste();

  const ctx = await request.newContext();
  try {
    const saude = await ctx.get(`${config.apiUrl}/cidades`);
    if (!saude.ok()) {
      throw new Error(
        `Backend E2E indisponível em ${config.apiUrl} (HTTP ${saude.status()}). ` +
          `Suba o ambiente: docker compose -f docker-compose.e2e.yml up -d e inicie o backend na porta correta.`,
      );
    }
    const login = await ctx.post(`${config.apiUrl}/login`, {
      data: { email: config.secretaria.email, senha: config.secretaria.senha },
    });
    if (login.status() !== 200) {
      throw new Error(
        `Login da secretaria falhou (HTTP ${login.status()}). Rode o seed usuario_inicial.ts no banco E2E.`,
      );
    }
  } finally {
    await ctx.dispose();
  }

  await limparBanco();
  await fecharDb();
}
