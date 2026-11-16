import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { bearer } from "../../test-helpers/httpAuth";

/**
 * Fluxo do cadastro de conteúdo acadêmico contra um Postgres real:
 * posse pelo 1º tópico → páginas → salvar → conflito 409 → reordenar →
 * publicar → professor não responsável bloqueado → transferência.
 *
 * Rodar: `npm run test:integration` (precisa de Docker).
 */

let ctx: PgIntegration;
let app: Express;
const ids: Record<string, string> = {};

async function criarProfessor(db: PgIntegration["db"], sufixo: string, cidadeId: string) {
  const [usuario] = await db("piv.usuario")
    .insert({ nome: `Prof ${sufixo}`, email: `prof.${sufixo}.${Date.now()}@teste.local`, senha: "x", tipo_usuario: "professor" })
    .returning("id");
  const [pessoa] = await db("piv.pessoa")
    .insert({
      nome: `Prof ${sufixo}`,
      data_nascimento: "1980-01-01",
      logradouro: "Rua",
      numero: "1",
      bairro: "Centro",
      cidade_id: cidadeId,
      estado: "MG",
      cep: "36500000",
      cpf: `${Date.now()}${sufixo}`.slice(-11),
    })
    .returning("id");
  const [professor] = await db("piv.professor")
    .insert({ usuario_id: usuario.id, pessoa_id: pessoa.id, faculdade_id: ids.faculdade, ativo: true })
    .returning("id");
  await db("piv.professor_disciplina").insert({ professor_id: professor.id, curso_disciplina_id: ids.cd });
  return { usuarioId: usuario.id as string, professorId: professor.id as string };
}

beforeAll(async () => {
  ctx = await startPgIntegration();
  ({ app } = await import("../../app"));
  const { db } = ctx;
  const cidade = await db("piv.cidade").first("ibge");
  const [faculdade] = await db("piv.faculdade")
    .insert({ nome: "Fac Conteúdo", cidade_id: cidade.ibge, logradouro: "R", numero: "1", bairro: "B", cep: "36500000" })
    .returning("id");
  ids.faculdade = faculdade.id;
  const [dep] = await db("piv.departamento").insert({ codigo: "DEP-CONT", nome: "Dep", faculdade_id: faculdade.id }).returning("id");
  const [curso] = await db("piv.curso").insert({ codigo: "ADS-CONT", nome: "ADS Conteúdo", departamento_id: dep.id }).returning("id");
  ids.curso = curso.id;
  const [disc] = await db("piv.disciplinas").insert({ codigo: "ALG-CONT", nome: "Algoritmos", carga_horaria: 40 }).returning("id");
  const [cd] = await db("piv.curso_disciplina")
    .insert({ curso_id: curso.id, disciplina_id: disc.id, carga_horaria: 40, periodo_ideal: 1 })
    .returning("id");
  ids.cd = cd.id;
  const a = await criarProfessor(db, "a", cidade.ibge);
  const b = await criarProfessor(db, "b", cidade.ibge);
  ids.usuarioA = a.usuarioId;
  ids.professorA = a.professorId;
  ids.usuarioB = b.usuarioId;
  ids.professorB = b.professorId;
  // A autoria (FK para usuario) exige um usuário real para a secretaria.
  const sec = await db("piv.usuario").whereIn("tipo_usuario", ["secretaria", "administrador"]).first("id", "tipo_usuario");
  ids.usuarioSecretaria = sec.id;
  ids.perfilSecretaria = sec.tipo_usuario;
}, 180_000);

afterAll(async () => {
  await ctx?.stop();
});

const profA = () => bearer("professor", ids.usuarioA);
const profB = () => bearer("professor", ids.usuarioB);
const secretaria = () => bearer(ids.perfilSecretaria, ids.usuarioSecretaria);

describe("Conteúdo acadêmico @int", () => {
  it("lista o curso e a disciplina disponível para o professor vinculado", async () => {
    const cursos = await request(app).get("/conteudos/cursos").set("Authorization", profA());
    expect(cursos.status).toBe(200);
    expect(cursos.body.map((c: any) => c.id)).toContain(ids.curso);

    const disciplinas = await request(app).get(`/conteudos/cursos/${ids.curso}/disciplinas`).set("Authorization", profA());
    expect(disciplinas.status).toBe(200);
    expect(disciplinas.body.disciplinas[0].situacao).toBe("disponivel");
  });

  it("o 1º tópico do professor A assume a responsabilidade", async () => {
    const res = await request(app)
      .post(`/conteudos/curso-disciplinas/${ids.cd}/topicos`)
      .set("Authorization", profA())
      .send({ titulo: "Estudo Dirigido 1" });
    expect(res.status).toBe(201);
    expect(res.body.assumiuResponsabilidade).toBe(true);
    ids.topico = res.body.topico.id;
  });

  it("o professor B passa a ver a disciplina bloqueada e recebe 403", async () => {
    const lista = await request(app).get(`/conteudos/cursos/${ids.curso}/disciplinas`).set("Authorization", profB());
    expect(lista.body.disciplinas[0].situacao).toBe("de_outro_professor");
    const detalhe = await request(app).get(`/conteudos/curso-disciplinas/${ids.cd}`).set("Authorization", profB());
    expect(detalhe.status).toBe(403);
  });

  it("cria página, salva blocos e detecta conflito de versão", async () => {
    const pagina = await request(app).post(`/conteudos/topicos/${ids.topico}/paginas`).set("Authorization", profA()).send({});
    expect(pagina.status).toBe(201);
    ids.pagina = pagina.body.pagina.id;

    const blocos = [{ type: "paragraph", content: [{ type: "text", text: "memória cache", styles: {} }], children: [] }];
    const salvo = await request(app).put(`/conteudos/paginas/${ids.pagina}`).set("Authorization", profA()).send({ blocos, versao: 1 });
    expect(salvo.status).toBe(200);
    expect(salvo.body.pagina.versao).toBe(2);
    expect(salvo.body.pagina.metricas.palavras).toBe(2);

    const conflito = await request(app).put(`/conteudos/paginas/${ids.pagina}`).set("Authorization", secretaria()).send({ blocos, versao: 1 });
    expect(conflito.status).toBe(409);
    expect(conflito.body.codigo).toBe("VERSAO_DESATUALIZADA");
  });

  it("move a página para um segundo tópico e publica", async () => {
    const t2 = await request(app)
      .post(`/conteudos/curso-disciplinas/${ids.cd}/topicos`)
      .set("Authorization", profA())
      .send({ titulo: "Estudo Dirigido 2" });
    const ordem = await request(app)
      .put(`/conteudos/curso-disciplinas/${ids.cd}/ordem`)
      .set("Authorization", profA())
      .send({ topicos: [{ id: t2.body.topico.id, paginas: [ids.pagina] }, { id: ids.topico, paginas: [] }] });
    expect(ordem.status).toBe(200);
    expect(ordem.body.topicos[0].paginas[0].id).toBe(ids.pagina);

    const vazio = await request(app).post(`/conteudos/topicos/${ids.topico}/publicar`).set("Authorization", profA());
    expect(vazio.status).toBe(422);
    const publicado = await request(app).post(`/conteudos/topicos/${t2.body.topico.id}/publicar`).set("Authorization", profA());
    expect(publicado.status).toBe(200);
    expect(publicado.body.publicado).toBe(true);
  });

  it("a secretaria transfere o responsável para o professor B", async () => {
    const res = await request(app)
      .put(`/conteudos/curso-disciplinas/${ids.cd}/responsavel`)
      .set("Authorization", secretaria())
      .send({ professorId: ids.professorB });
    expect(res.status).toBe(200);
    expect(res.body.responsavel.id).toBe(ids.professorB);

    expect((await request(app).get(`/conteudos/curso-disciplinas/${ids.cd}`).set("Authorization", profB())).status).toBe(200);
    expect((await request(app).get(`/conteudos/curso-disciplinas/${ids.cd}`).set("Authorization", profA())).status).toBe(403);
  });

  it("aluno não acessa o módulo", async () => {
    const res = await request(app).get("/conteudos/cursos").set("Authorization", bearer("aluno"));
    expect(res.status).toBe(403);
  });
});
