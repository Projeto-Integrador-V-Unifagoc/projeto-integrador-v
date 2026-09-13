import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPgIntegration, type PgIntegration } from "../test-helpers/pgIntegration";
import { bearer } from "../test-helpers/httpAuth";

/**
 * Integração da política de autorização (spec §8/§17.4) aplicada às rotas reais
 * do Express: rota pública, rota só-autenticada e rota só-secretaria.
 *
 * Rodar: `npm run test:integration` (precisa de Docker).
 */

let ctx: PgIntegration;
let app: Express;

beforeAll(async () => {
  ctx = await startPgIntegration();
  ({ app } = await import("../app"));
}, 180_000);

afterAll(async () => {
  await ctx?.stop();
});

describe("Política de autorização — rotas Express reais @int", () => {
  it("rota pública: GET /cidades responde 200 sem token", async () => {
    const res = await request(app).get("/cidades");
    expect(res.status).toBe(200);
  });

  it("rota autenticada: GET /disciplinas exige token", async () => {
    expect((await request(app).get("/disciplinas")).status).toBe(401);
    expect(
      (await request(app).get("/disciplinas").set("Authorization", bearer("aluno"))).status,
    ).toBe(200);
  });

  it("token com assinatura inválida é rejeitado com 401", async () => {
    const res = await request(app)
      .get("/disciplinas")
      .set("Authorization", "Bearer abc.def.ghi");
    expect(res.status).toBe(401);
  });

  it("rota de escrita administrativa: POST /disciplinas só para secretaria/admin", async () => {
    const semToken = await request(app).post("/disciplinas").send({});
    expect(semToken.status).toBe(401);

    const comProfessor = await request(app)
      .post("/disciplinas")
      .set("Authorization", bearer("professor"))
      .send({ codigo: "X1", nome: "X", cargaHoraria: 30 });
    expect(comProfessor.status).toBe(403);

    const comSecretaria = await request(app)
      .post("/disciplinas")
      .set("Authorization", bearer("secretaria"))
      .send({ codigo: "AUTZ-101", nome: "Autorização OK", cargaHoraria: 30 });
    expect(comSecretaria.status).toBe(201);
  });

  it("router com guarda de grupo: GET /professores só para secretaria", async () => {
    expect((await request(app).get("/professores")).status).toBe(401);
    expect(
      (await request(app).get("/professores").set("Authorization", bearer("professor"))).status,
    ).toBe(403);
    expect(
      (await request(app).get("/professores").set("Authorization", bearer("secretaria"))).status,
    ).toBe(200);
  });

  it("administrador tem o mesmo acesso da secretaria", async () => {
    const res = await request(app)
      .get("/professores")
      .set("Authorization", bearer("administrador"));
    expect(res.status).toBe(200);
  });
});
