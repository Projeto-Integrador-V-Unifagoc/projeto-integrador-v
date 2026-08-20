import { test, expect } from "../fixtures/test.js";
import { loginViaUI } from "../fixtures/auth.fixture.js";

/**
 * UI — aluno (spec §13). Seed via API no backend E2E e navegação pela UI. Só
 * executa quando `E2E_WEB_URL` aponta para um frontend ligado ao backend E2E.
 */
test.describe("UI Aluno @ui", () => {
  test("aluno autentica e acessa a área logada", async ({ page, novoCenario }) => {
    const cenario = await novoCenario();
    const matriculado = await cenario.matricularAluno();

    await loginViaUI(page, matriculado.email, matriculado.senha);
    const user = await page.evaluate(() => window.localStorage.getItem("@UniEduca:user"));
    expect(user).toBeTruthy();
    expect(JSON.parse(user as string).tipo_usuario).toBe("aluno");
  });
});
