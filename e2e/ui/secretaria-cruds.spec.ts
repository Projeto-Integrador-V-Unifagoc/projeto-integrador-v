import { test, expect } from "../fixtures/test.js";
import { config } from "../helpers/config.js";
import { loginViaUI } from "../fixtures/auth.fixture.js";

/**
 * UI — secretaria (spec §13). Estes testes só executam quando `E2E_WEB_URL` está
 * configurado para um frontend buildado contra o backend E2E (porta 3100).
 * Complementam, não substituem, os testes de API.
 */
test.describe("UI Secretaria @ui", () => {
  test("login da secretaria leva à área autenticada", async ({ page }) => {
    await loginViaUI(page, config.secretaria.email, config.secretaria.senha);
    // Estado observável: token persistido e saída da tela de login.
    const token = await page.evaluate(() => window.localStorage.getItem("@UniEduca:token"));
    expect(token).toBeTruthy();
    expect(page.url()).not.toContain("/login");
  });

  test("credenciais inválidas exibem mensagem de erro e permanecem no login", async ({ page }) => {
    await page.goto(`${config.webUrl}/login`);
    await page.getByLabel("E-mail").fill("invalido@e2e.test");
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Acessar" }).click();
    // Sem token e ainda na tela de login (mensagem de erro observável via toast).
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("@UniEduca:token")))
      .toBeNull();
    expect(page.url()).toContain("/login");
  });
});
