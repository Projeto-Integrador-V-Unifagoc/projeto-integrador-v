import { test, expect } from "../fixtures/test.js";
import { config } from "../helpers/config.js";
import * as ids from "../helpers/ids.js";

/**
 * Módulo `usuario-perfil-autenticacao` (spec §6, §11.1, §14).
 * Login, JWT, renovação de token, contrato de erros e isolamento de senha.
 */
test.describe("Autenticação e usuários @api", () => {
  test("login válido da secretaria retorna token e usuário sem senha", async ({ api }) => {
    const resp = await api.post("/login", {
      body: { email: config.secretaria.email, senha: config.secretaria.senha },
    });
    expect(resp.status).toBe(200);
    expect(typeof resp.body.token).toBe("string");
    expect(resp.body.user).toMatchObject({ email: config.secretaria.email, tipo_usuario: "secretaria" });
    expect(JSON.stringify(resp.body)).not.toMatch(/senha|\$2[aby]\$/i);
  });

  test("senha incorreta retorna 401", async ({ api }) => {
    const resp = await api.post("/login", {
      body: { email: config.secretaria.email, senha: "senha-errada" },
    });
    expect(resp.status).toBe(401);
  });

  test("usuário inexistente retorna 401", async ({ api }) => {
    const resp = await api.post("/login", {
      body: { email: `nao.existe.${ids.runId()}@e2e.test`, senha: "x" },
    });
    expect(resp.status).toBe(401);
  });

  test("login sem credenciais retorna 400", async ({ api }) => {
    const resp = await api.post("/login", { body: {} });
    expect(resp.status).toBe(400);
  });

  test("/me sem token retorna 401", async ({ api }) => {
    const resp = await api.get("/me");
    expect(resp.status).toBe(401);
  });

  test("/me autenticado retorna dados sem hash de senha e renova token", async ({ apiSecretaria }) => {
    const resp = await apiSecretaria.get("/me");
    expect(resp.status).toBe(200);
    expect(resp.body.data).toBeTruthy();
    expect(JSON.stringify(resp.body)).not.toMatch(/\$2[aby]\$/);
    expect(resp.body.data.senha).toBeUndefined();
    // Header de renovação presente em requisições autenticadas (§11.1).
    expect(resp.headers["x-token-renovado"]).toBeTruthy();
  });

  test("token malformado retorna 401", async ({ api }) => {
    const resp = await api.get("/me", { token: "isto-nao-e-um-jwt" });
    expect(resp.status).toBe(401);
  });

  test("cadastro sem autenticação retorna 401", async ({ api }) => {
    const resp = await api.post("/cadastro", {
      body: { nome: "X", email: ids.email("x", ids.runId()), senha: "Senha@123", tipo_usuario: "secretaria" },
    });
    expect(resp.status).toBe(401);
  });

  test("e-mail duplicado é rejeitado", async ({ apiSecretaria }) => {
    const email = ids.email("dup", ids.runId());
    const corpo = { nome: "Dup", email, senha: "Senha@123", tipo_usuario: "secretaria" as const };
    const primeira = await apiSecretaria.post("/cadastro", { body: corpo });
    expect(primeira.status).toBe(201);
    const segunda = await apiSecretaria.post("/cadastro", { body: corpo });
    expect(segunda.status).toBe(400);
    expect(JSON.stringify(segunda.body)).toMatch(/e-mail|email/i);
  });

  test("listar usuários exige secretaria (anônimo 401)", async ({ api }) => {
    const resp = await api.get("/usuarios");
    expect(resp.status).toBe(401);
  });

  test("tipo_usuario inválido retorna 400", async ({ apiSecretaria }) => {
    const resp = await apiSecretaria.post("/cadastro", {
      body: { nome: "X", email: ids.email("inv", ids.runId()), senha: "Senha@123", tipo_usuario: "rei" },
    });
    expect(resp.status).toBe(400);
  });
});
