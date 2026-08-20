import { test, expect } from "../fixtures/test.js";
import { loginViaUI } from "../fixtures/auth.fixture.js";

/**
 * UI — professor (spec §13). Seed via API; login pela UI. Só executa quando
 * `E2E_WEB_URL` está configurado para o frontend ligado ao backend E2E.
 */
test.describe("UI Professor @ui", () => {
  test("professor autentica e acessa a área logada", async ({ page, novoCenario }) => {
    const cenario = await novoCenario();
    await loginViaUI(page, cenario.professor.email, "Professor@123");
    const user = await page.evaluate(() => window.localStorage.getItem("@UniEduca:user"));
    expect(user).toBeTruthy();
    expect(JSON.parse(user as string).tipo_usuario).toBe("professor");
  });
});
