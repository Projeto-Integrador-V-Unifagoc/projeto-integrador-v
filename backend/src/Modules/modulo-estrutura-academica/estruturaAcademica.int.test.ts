import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { bearer } from "../../test-helpers/httpAuth";

/**
 * Integração da cadeia acadêmica completa, exercitada apenas pelas rotas HTTP:
 *   cidade (seed) → faculdade → departamento → curso → disciplina
 *   → curso-disciplina → período letivo → turma.
 *
 * Cobre o encadeamento de chaves estrangeiras entre vários controllers /
 * repositories contra um Postgres real, além dos erros de vínculo (400).
 *
 * Rodar: `npm run test:integration` (precisa de Docker).
 */

let ctx: PgIntegration;
let app: Express;
const auth = () => bearer("secretaria");
const sufixo = Date.now().toString().slice(-6);

beforeAll(async () => {
  ctx = await startPgIntegration();
  ({ app } = await import("../../app"));
}, 180_000);

afterAll(async () => {
  await ctx?.stop();
});

describe("Estrutura acadêmica — cadeia de FKs + Postgres real @int", () => {
  const ids: Record<string, string> = {};
  let cidadeIbge: string;

  it("usa uma cidade semeada como âncora da faculdade", async () => {
    const res = await request(app).get("/cidades");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    cidadeIbge = res.body[0].ibge;
  });

  it("POST /faculdades cria a faculdade", async () => {
    const res = await request(app)
      .post("/faculdades")
      .set("Authorization", auth())
      .send({
        nome: `Faculdade Integração ${sufixo}`,
        cidadeIbge,
        logradouro: "Rua das Provas",
        numero: "100",
        bairro: "Centro",
        cep: "35000-000",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    ids.faculdade = res.body.id;
  });

  it("POST /departamentos cria o departamento vinculado à faculdade", async () => {
    const res = await request(app)
      .post("/departamentos")
      .set("Authorization", auth())
      .send({ codigo: `DEP-${sufixo}`, nome: "Computação", faculdadeId: ids.faculdade });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    ids.departamento = res.body.id;
  });

  it("POST /cursos cria o curso vinculado ao departamento", async () => {
    const res = await request(app)
      .post("/cursos")
      .set("Authorization", auth())
      .send({ codigo: `CUR-${sufixo}`, nome: "Sistemas de Informação", departamentoId: ids.departamento });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    ids.curso = res.body.id;
  });

  it("POST /disciplinas cria a disciplina", async () => {
    const res = await request(app)
      .post("/disciplinas")
      .set("Authorization", auth())
      .send({ codigo: `DIS-${sufixo}`, nome: "Banco de Dados", cargaHoraria: 60 });
    expect(res.status).toBe(201);
    ids.disciplina = res.body.id;
  });

  it("POST /curso-disciplina associa disciplina ao curso (matriz curricular)", async () => {
    const res = await request(app)
      .post("/curso-disciplina")
      .set("Authorization", auth())
      .send({ cursoId: ids.curso, disciplinaId: ids.disciplina, periodoIdeal: 3, cargaHoraria: 60 });
    expect(res.status).toBe(201);
    ids.cursoDisciplina = res.body.id;
  });

  it("POST /curso-disciplina rejeita curso inexistente com 400", async () => {
    const res = await request(app)
      .post("/curso-disciplina")
      .set("Authorization", auth())
      .send({ cursoId: "00000000-0000-4000-8000-000000000000", disciplinaId: ids.disciplina, periodoIdeal: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Curso nao encontrado/);
  });

  it("POST /curso-disciplina rejeita associação duplicada com 400", async () => {
    const res = await request(app)
      .post("/curso-disciplina")
      .set("Authorization", auth())
      .send({ cursoId: ids.curso, disciplinaId: ids.disciplina, periodoIdeal: 3, cargaHoraria: 60 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ja associada/);
  });

  it("GET /cursos/:id/matriz-curricular devolve a disciplina associada", async () => {
    const res = await request(app)
      .get(`/cursos/${ids.curso}/matriz-curricular`)
      .set("Authorization", auth());
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain(ids.disciplina);
  });

  it("POST /periodos-letivos cria o período letivo", async () => {
    const res = await request(app)
      .post("/periodos-letivos")
      .set("Authorization", auth())
      .send({ codigo: `PL-${sufixo}`, ano: 2028, semestre: 1, dataInicio: "2028-02-01", dataFim: "2028-06-30" });
    expect(res.status).toBe(201);
    ids.periodo = res.body.id;
  });

  it("POST /turmas cria a turma amarrando curso + período letivo", async () => {
    const res = await request(app)
      .post("/turmas")
      .set("Authorization", auth())
      .send({
        cursoId: ids.curso,
        periodoLetivoId: ids.periodo,
        periodoCurricular: 3,
        descricao: "Turma Integração",
        sigla: `T${sufixo}`,
        capacidadeAlunos: 40,
        turno: "NOITE",
      });
    expect(res.status).toBe(201);
    ids.turma = res.body.id;

    const [linha] = await ctx.db("turma").withSchema("piv").where({ id: ids.turma });
    expect(linha.curso_id).toBe(ids.curso);
    expect(linha.periodo_letivo_id).toBe(ids.periodo);
  });

  it("POST /turmas rejeita capacidade zero com 400", async () => {
    const res = await request(app)
      .post("/turmas")
      .set("Authorization", auth())
      .send({
        cursoId: ids.curso,
        periodoLetivoId: ids.periodo,
        periodoCurricular: 3,
        descricao: "Turma inválida",
        sigla: `TZ${sufixo}`,
        capacidadeAlunos: 0,
        turno: "NOITE",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Capacidade de alunos deve ser maior que zero/);
  });

  it("POST /turmas/:id/disciplinas rejeita professor inexistente com 400", async () => {
    const res = await request(app)
      .post(`/turmas/${ids.turma}/disciplinas`)
      .set("Authorization", auth())
      .send({ cursoDisciplinaId: ids.cursoDisciplina, professorId: "00000000-0000-4000-8000-000000000000" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Professor nao encontrado/);
  });

  it("DELETE /cursos/:id com turma vinculada devolve 400 traduzido", async () => {
    const res = await request(app).delete(`/cursos/${ids.curso}`).set("Authorization", auth());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Nao e possivel remover o curso/);
  });
});
