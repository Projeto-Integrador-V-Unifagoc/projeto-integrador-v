import type { Page } from "@playwright/test";
import { config } from "../helpers/config.js";

/**
 * Auxiliares de autenticação na UI (spec §13). Faz login pela interface usando
 * seletores por label/role (evita classes/textos instáveis) e aguarda estados
 * observáveis — sem `waitForTimeout`.
 */
export async function loginViaUI(page: Page, email: string, senha: string): Promise<void> {
  await page.goto(`${config.webUrl}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Acessar" }).click();
  // O app guarda o token no localStorage e navega para a home.
  await page.waitForFunction(() => Boolean(window.localStorage.getItem("@UniEduca:token")));
}

export async function logoutViaStorage(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear());
}
