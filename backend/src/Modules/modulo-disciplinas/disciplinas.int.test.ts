import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { bearer } from "../../test-helpers/httpAuth";

/**
 * Integração do CRUD de disciplinas: controller → service → repository → Postgres
 * real. Verifica round-trip de persistência, unicidade de código e 404.
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

describe("Disciplinas — CRUD + Postgres real @int", () => {
  let disciplinaId: string;

  it("POST /disciplinas cria a disciplina e persiste no schema piv", async () => {
    const res = await request(app)
      .post("/disciplinas")
      .set("Authorization", auth())
      .send({ codigo: "INT-POO", nome: "Programação Orientada a Objetos", cargaHoraria: "60", preRequisito: null });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    disciplinaId = res.body.id;

    const [linha] = await ctx.db("disciplinas").withSchema("piv").where({ id: disciplinaId });
    expect(linha.codigo).toBe("INT-POO");
    expect(Number(linha.carga_horaria)).toBe(60);
  });

  it("GET /disciplinas e GET /disciplinas/:id retornam a disciplina criada", async () => {
    const lista = await request(app).get("/disciplinas").set("Authorization", auth());
    expect(lista.status).toBe(200);
    expect(lista.body.some((d: any) => d.id === disciplinaId)).toBe(true);

    const porId = await request(app).get(`/disciplinas/${disciplinaId}`).set("Authorization", auth());
    expect(porId.status).toBe(200);
    expect(porId.body.codigo).toBe("INT-POO");
  });

  it("POST /disciplinas rejeita código duplicado com 400", async () => {
    const res = await request(app)
      .post("/disciplinas")
      .set("Authorization", auth())
      .send({ codigo: "INT-POO", nome: "Outra", cargaHoraria: 40 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/codigo/i);
  });

  it("PUT /disciplinas/:id atualiza os campos informados", async () => {
    const res = await request(app)
      .put(`/disciplinas/${disciplinaId}`)
      .set("Authorization", auth())
      .send({ nome: "POO (revisada)", cargaHoraria: 80 });
    expect(res.status).toBe(200);

    const porId = await request(app).get(`/disciplinas/${disciplinaId}`).set("Authorization", auth());
    expect(porId.body.nome).toBe("POO (revisada)");
    expect(Number(porId.body.carga_horaria ?? porId.body.cargaHoraria)).toBe(80);
  });

  it("PUT /disciplinas/:id inexistente responde 404", async () => {
    const res = await request(app)
      .put("/disciplinas/00000000-0000-4000-8000-000000000000")
      .set("Authorization", auth())
      .send({ nome: "x" });
    expect(res.status).toBe(404);
  });

  it("DELETE /disciplinas/:id remove e um GET seguinte responde 404", async () => {
    const del = await request(app).delete(`/disciplinas/${disciplinaId}`).set("Authorization", auth());
    expect(del.status).toBe(204);

    const porId = await request(app).get(`/disciplinas/${disciplinaId}`).set("Authorization", auth());
    expect(porId.status).toBe(404);

    const linhas = await ctx.db("disciplinas").withSchema("piv").where({ id: disciplinaId });
    expect(linhas).toHaveLength(0);
  });
});
