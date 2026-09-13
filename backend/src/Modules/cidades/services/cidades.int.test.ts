import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPgIntegration, type PgIntegration } from "../../../test-helpers/pgIntegration";

/**
 * Exemplo de teste de INTEGRAÇÃO (projeto `integration` do vitest.config.mts).
 * Sobe Postgres real via Testcontainers, aplica migrations + seed de cidades e
 * exercita as rotas Express de verdade com supertest — sem mockar o repositório.
 *
 * Rodar: `npm run test:integration` (precisa de Docker).
 */

let ctx: PgIntegration;
let app: Express;

beforeAll(async () => {
  ctx = await startPgIntegration();
  // Só agora, com DATABASE_URL apontando para o container, importamos o app.
  ({ app } = await import("../../../app"));
}, 180_000);

afterAll(async () => {
  await ctx?.stop();
});

describe("Cidades — rotas + Postgres real @int", () => {
  it("GET /health responde 200 sem tocar o banco", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /cidades lê as cidades semeadas do schema piv", async () => {
    const res = await request(app).get("/cidades");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("ibge");
  });

  it("GET /cidades/:ibge retorna a cidade correspondente", async () => {
    const { body: lista } = await request(app).get("/cidades");
    const ibge = lista[0].ibge;
    const res = await request(app).get(`/cidades/${ibge}`);
    expect(res.status).toBe(200);
    expect(String(res.body.ibge)).toBe(String(ibge));
  });
});
