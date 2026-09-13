import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPgIntegration, type PgIntegration } from "../../../test-helpers/pgIntegration";
import { bearer } from "../../../test-helpers/httpAuth";

/**
 * Integração do fluxo de autenticação (projeto `integration`).
 * Sobe Postgres real via Testcontainers, aplica migrations + seed `usuario_inicial`
 * (secretaria `suporte@unieduca.com.br` / `unieduca2026`) e exercita as rotas
 * `/login`, `/me`, `/cadastro`, `/usuarios` de ponta a ponta.
 *
 * Rodar: `npm run test:integration` (precisa de Docker).
 */

const EMAIL_SECRETARIA = "suporte@unieduca.com.br";
const SENHA_SECRETARIA = "unieduca2026";

let ctx: PgIntegration;
let app: Express;

beforeAll(async () => {
  ctx = await startPgIntegration();
  ({ app } = await import("../../../app"));
}, 180_000);

afterAll(async () => {
  await ctx?.stop();
});

describe("Autenticação — rotas + Postgres real @int", () => {
  it("POST /login autentica a secretaria semeada e devolve token + user", async () => {
    const res = await request(app).post("/login").send({ email: EMAIL_SECRETARIA, senha: SENHA_SECRETARIA });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({ email: EMAIL_SECRETARIA, tipo_usuario: "secretaria" });
  });

  it("POST /login rejeita senha incorreta com 401", async () => {
    const res = await request(app).post("/login").send({ email: EMAIL_SECRETARIA, senha: "errada" });
    expect(res.status).toBe(401);
  });

  it("POST /login exige email e senha", async () => {
    const res = await request(app).post("/login").send({ email: EMAIL_SECRETARIA });
    expect(res.status).toBe(400);
  });

  it("GET /me sem token responde 401", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
  });

  it("GET /me com token do login retorna os dados do usuário sem a senha", async () => {
    const login = await request(app).post("/login").send({ email: EMAIL_SECRETARIA, senha: SENHA_SECRETARIA });
    const res = await request(app).get("/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(EMAIL_SECRETARIA);
    expect(res.body.data.senha).toBeUndefined();
  });

  it("POST /cadastro sem token responde 401 e com token de aluno responde 403", async () => {
    const semToken = await request(app).post("/cadastro").send({});
    expect(semToken.status).toBe(401);

    const comAluno = await request(app)
      .post("/cadastro")
      .set("Authorization", bearer("aluno"))
      .send({ nome: "X", email: "x@x.com", senha: "12345678", tipo_usuario: "secretaria" });
    expect(comAluno.status).toBe(403);
  });

  it("POST /cadastro cria um usuário novo e rejeita e-mail duplicado", async () => {
    const login = await request(app).post("/login").send({ email: EMAIL_SECRETARIA, senha: SENHA_SECRETARIA });
    const auth = `Bearer ${login.body.token}`;
    const novo = { nome: "Coordenação", email: "coord@unieduca.com.br", senha: "senhaForte1", tipo_usuario: "secretaria" };

    const criado = await request(app).post("/cadastro").set("Authorization", auth).send(novo);
    expect(criado.status).toBe(201);
    expect(criado.body.usuario).toMatchObject({ email: novo.email, tipo_usuario: "secretaria" });

    const duplicado = await request(app).post("/cadastro").set("Authorization", auth).send(novo);
    expect(duplicado.status).toBe(400);

    const noBanco = await ctx.db("usuario").withSchema("piv").where({ email: novo.email });
    expect(noBanco).toHaveLength(1);
  });

  it("GET /usuarios exige secretaria e lista os usuários", async () => {
    const login = await request(app).post("/login").send({ email: EMAIL_SECRETARIA, senha: SENHA_SECRETARIA });
    const res = await request(app).get("/usuarios").set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
