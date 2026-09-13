import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { bearer } from "../../test-helpers/httpAuth";

/**
 * Integração do CRUD de período letivo: valida que as regras do serviço
 * (semestre 1|2, datas coerentes, código e ano/semestre únicos) chegam ao
 * cliente como HTTP 400 e que o registro válido persiste no Postgres.
 *
 * Rodar: `npm run test:integration` (precisa de Docker).
 */

let ctx: PgIntegration;
let app: Express;
const auth = () => bearer("secretaria");

beforeAll(async () => {
  ctx = await startPgIntegration();
  ({ app } = await import("../../app"));
}, 180_000);

afterAll(async () => {
  await ctx?.stop();
});

const valido = {
  codigo: "2027/1",
  ano: 2027,
  semestre: 1,
  dataInicio: "2027-02-01",
  dataFim: "2027-06-30",
};

describe("Períodos letivos — CRUD + validações + Postgres real @int", () => {
  let periodoId: string;

  it("POST /periodos-letivos cria um período válido e persiste", async () => {
    const res = await request(app).post("/periodos-letivos").set("Authorization", auth()).send(valido);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    periodoId = res.body.id;

    const [linha] = await ctx.db("periodo_letivo").withSchema("piv").where({ id: periodoId });
    expect(linha.codigo).toBe("2027/1");
    expect(linha.status).toBe("planejado");
  });

  it("POST /periodos-letivos rejeita semestre fora de {1,2} com 400", async () => {
    const res = await request(app)
      .post("/periodos-letivos")
      .set("Authorization", auth())
      .send({ ...valido, codigo: "2027/3", semestre: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Semestre deve ser 1 ou 2/);
  });

  it("POST /periodos-letivos rejeita data fim anterior à data início com 400", async () => {
    const res = await request(app)
      .post("/periodos-letivos")
      .set("Authorization", auth())
      .send({ ...valido, codigo: "2027/2", semestre: 2, dataInicio: "2027-06-30", dataFim: "2027-02-01" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Data fim deve ser maior/);
  });

  it("POST /periodos-letivos rejeita código duplicado com 400", async () => {
    const res = await request(app).post("/periodos-letivos").set("Authorization", auth()).send(valido);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/codigo|ano e semestre/);
  });

  it("GET /periodos-letivos lista e GET /:id retorna o período criado", async () => {
    const lista = await request(app).get("/periodos-letivos").set("Authorization", auth());
    expect(lista.status).toBe(200);
    expect(lista.body.some((p: any) => p.id === periodoId)).toBe(true);

    const porId = await request(app).get(`/periodos-letivos/${periodoId}`).set("Authorization", auth());
    expect(porId.status).toBe(200);
  });

  it("PUT /periodos-letivos/:id atualiza e DELETE remove (204 → 404)", async () => {
    const upd = await request(app)
      .put(`/periodos-letivos/${periodoId}`)
      .set("Authorization", auth())
      .send({ status: "ativo" });
    expect(upd.status).toBe(200);

    const del = await request(app).delete(`/periodos-letivos/${periodoId}`).set("Authorization", auth());
    expect(del.status).toBe(204);

    const porId = await request(app).get(`/periodos-letivos/${periodoId}`).set("Authorization", auth());
    expect(porId.status).toBe(404);
  });
});
