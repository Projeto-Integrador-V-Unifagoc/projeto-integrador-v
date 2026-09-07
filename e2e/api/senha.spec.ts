import crypto from "node:crypto";

import { test, expect } from "../fixtures/test.js";
import { db } from "../helpers/db.js";
import * as ids from "../helpers/ids.js";

test.describe("Validação de senha @api", () => {
  test("rejeita senhas que não atendem aos requisitos mínimos", async ({ apiSecretaria }) => {
    const senhasInvalidas = [
      "Aa@1234",
      "senha@123",
      "SENHA@123",
      "Senha@abc",
      "Senha1234",
      "Senha @123",
      `Senha@1${"a".repeat(66)}`,
    ];

    for (const [indice, senha] of senhasInvalidas.entries()) {
      const resposta = await apiSecretaria.post("/cadastro", {
        body: {
          nome: `Senha inválida ${indice}`,
          email: ids.email(`senha-invalida-${indice}`, ids.runId()),
          senha,
          tipo_usuario: "secretaria",
        },
      });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toMatch(/senha/i);
    }
  });

  test("armazena hash bcrypt e autentica com uma senha válida", async ({ api, apiSecretaria }) => {
    const email = ids.email("senha-valida", ids.runId());
    const senha = "Senha@123";
    const cadastro = await apiSecretaria.post("/cadastro", {
      body: { nome: "Senha válida", email, senha, tipo_usuario: "secretaria" },
    });

    expect(cadastro.status).toBe(201);

    const usuario = await db()("piv.usuario").where({ email }).first();
    expect(usuario.senha).not.toBe(senha);
    expect(usuario.senha).toMatch(/^\$2[aby]\$10\$/);

    const login = await api.post("/login", { body: { email, senha } });
    expect(login.status).toBe(200);
    expect(JSON.stringify(login.body)).not.toContain(usuario.senha);
  });

  test("valida a senha na edição e invalida a senha anterior após a troca", async ({ api, apiSecretaria }) => {
    const email = ids.email("senha-edicao", ids.runId());
    const senhaAnterior = "Anterior@123";
    const senhaNova = "NovaSenha@456";
    const cadastro = await apiSecretaria.post("/cadastro", {
      body: { nome: "Senha edição", email, senha: senhaAnterior, tipo_usuario: "secretaria" },
    });
    const usuarioId = cadastro.body.usuario.id;

    const edicaoInvalida = await apiSecretaria.put(`/usuarios/${usuarioId}`, {
      body: { senha: "senha-fraca" },
    });
    expect(edicaoInvalida.status).toBe(400);

    const loginPreservado = await api.post("/login", {
      body: { email, senha: senhaAnterior },
    });
    expect(loginPreservado.status).toBe(200);

    const edicaoValida = await apiSecretaria.put(`/usuarios/${usuarioId}`, {
      body: { senha: senhaNova },
    });
    expect(edicaoValida.status).toBe(200);

    expect((await api.post("/login", { body: { email, senha: senhaAnterior } })).status).toBe(401);
    expect((await api.post("/login", { body: { email, senha: senhaNova } })).status).toBe(200);
  });

  test("valida a redefinição, consome o token e armazena um novo hash", async ({ api, apiSecretaria }) => {
    const email = ids.email("senha-redefinicao", ids.runId());
    const senhaAnterior = "Anterior@123";
    const senhaNova = "Redefinida@456";
    const cadastro = await apiSecretaria.post("/cadastro", {
      body: { nome: "Senha redefinição", email, senha: senhaAnterior, tipo_usuario: "secretaria" },
    });
    const usuarioId = cadastro.body.usuario.id;
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await db()("piv.recuperacao_senha").insert({
      usuario_id: usuarioId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    });

    const redefinicaoInvalida = await api.post("/redefinir-senha", {
      body: { token, novaSenha: "senha-fraca", confirmarSenha: "senha-fraca" },
    });
    expect(redefinicaoInvalida.status).toBe(400);

    const redefinicaoValida = await api.post("/redefinir-senha", {
      body: { token, novaSenha: senhaNova, confirmarSenha: senhaNova },
    });
    expect(redefinicaoValida.status).toBe(200);

    const usuario = await db()("piv.usuario").where({ id: usuarioId }).first();
    expect(usuario.senha).not.toBe(senhaNova);
    expect(usuario.senha).toMatch(/^\$2[aby]\$10\$/);
    expect((await api.post("/login", { body: { email, senha: senhaAnterior } })).status).toBe(401);
    expect((await api.post("/login", { body: { email, senha: senhaNova } })).status).toBe(200);

    const reutilizacao = await api.post("/redefinir-senha", {
      body: { token, novaSenha: "OutraSenha@789", confirmarSenha: "OutraSenha@789" },
    });
    expect(reutilizacao.status).toBe(400);
  });
});
