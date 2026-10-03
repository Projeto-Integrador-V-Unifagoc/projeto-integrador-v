import type { Knex } from "knex";
import { test, expect } from "../fixtures/test.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import { pegarCidade, db, exigirBancoDeTeste, fecharDb } from "../helpers/db.js";
import * as ids from "../helpers/ids.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";

test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());

async function preparar(c: Cenario, lancar = true) {
  await c.configurarRegra("120");
  const { aluno, matriculaId } = await c.matricularAluno();
  const resposta = await c.apiProfessor.post("/avaliacoes", { body: { tipo_avaliacao: "REGULAR", valor: "18.00",
    subgrupo_id: c.regraPontuacao!.subgrupos[0].id, turma_disciplina_id: c.turmaDisciplinaId,
    descricao_avaliacao: "Integridade sintética T050", data_lancamento: "2026-09-28", data_devolucao: "2026-10-01" } });
  expect(resposta.status).toBe(201);
  const avaliacaoId = String(resposta.body.id);
  if (lancar) expect((await c.apiProfessor.put(`/notas/avaliacoes/${avaliacaoId}/lote`, {
    body: { itens: [{ alunoId: aluno.id, valor: "0.00" }] } })).status).toBe(200);
  const vinculo = await db()("piv.matricula_turma_disciplina").where({ matricula_id: matriculaId, turma_disciplina_id: c.turmaDisciplinaId }).first();
  return { aluno, matriculaId, vinculoId: String(vinculo.id), avaliacaoId };
}
async function grafo(c: Cenario) {
  const ofertas = await db()("piv.turma_disciplina").where({ id: c.turmaDisciplinaId });
  const avaliacoes = await db()("piv.avaliacao").where({ turma_disciplina_id: c.turmaDisciplinaId }).orderBy("id");
  const notas = await db()("piv.nota").whereIn("avaliacao_id", avaliacoes.map((a) => a.id)).orderBy("id");
  const auditorias = await db()("piv.nota_auditoria").whereIn("nota_id", notas.map((n) => n.id)).orderBy("id");
  const regra = await db()("piv.regra_pontuacao").where({ id: c.regraPontuacao!.id }).first();
  const matriculas = await db()("piv.matricula").where({ turma_id: c.turmaId }).orderBy("id");
  const vinculos = await db()("piv.matricula_turma_disciplina").where({ turma_disciplina_id: c.turmaDisciplinaId }).orderBy("id");
  return { ofertas, avaliacoes, notas, auditorias, regra, matriculas, vinculos };
}
async function sqlBloqueado(operacao: (trx: Knex.Transaction) => Promise<unknown>, codigos = ["23514", "23503"]) {
  const sucessoInesperado = new Error("O guard deveria rejeitar esta operação.");
  let erro: any;
  try {
    await db().transaction(async (trx) => { await operacao(trx); throw sucessoInesperado; });
  } catch (e) { erro = e; }
  // Mesmo um sucesso inesperado é revertido; somente registros próprios são alvos.
  expect(erro).not.toBe(sucessoInesperado);
  expect(codigos).toContain(erro?.code);
}

test.describe("Constraints e integridade @integrity", () => {
  test("FK inexistente é rejeitada sem expor SQL", async ({ apiSecretaria, runId }) => {
    const fake = ids.uuid();
    const cd = await apiSecretaria.post("/curso-disciplina", { body: { cursoId: fake, disciplinaId: fake, periodoIdeal: 1 } });
    expect(cd.status).toBe(400);
    const cidade = await pegarCidade(); const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
    const dep = await estrutura.criarDepartamento(apiSecretaria, runId, fac.id); const curso = await estrutura.criarCurso(apiSecretaria, runId, dep.id);
    const turma = await apiSecretaria.post("/turmas", { body: { periodoLetivoId: fake, cursoId: curso.id, periodoCurricular: 1,
      descricao: "Turma inválida sintética", sigla: ids.sigla(runId), capacidadeAlunos: 10, turno: "NOITE" } });
    expect(turma.status).toBe(400);
    const avaliacao = await apiSecretaria.post("/avaliacoes", { body: { tipo_avaliacao: "REGULAR", data_lancamento: "2026-09-28",
      valor: "18.00", subgrupo_id: fake, turma_disciplina_id: fake } });
    expect(avaliacao.status).toBe(404);
    expect(JSON.stringify(avaliacao.body)).not.toMatch(/SQL|piv\.|stack|constraint/);
  });

  test("código de departamento duplicado é rejeitado", async ({ apiSecretaria, runId }) => {
    const cidade = await pegarCidade(); const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
    const codigo = ids.codigo("DEP", runId);
    expect((await apiSecretaria.post("/departamentos", { body: { codigo, nome: "Primeiro", faculdadeId: fac.id } })).status).toBe(201);
    expect((await apiSecretaria.post("/departamentos", { body: { codigo, nome: "Duplicado", faculdadeId: fac.id } })).status).not.toBe(201);
  });

  test("RESTRICT por HTTP preserva pais, nota zero, regra e auditoria", async ({ novoCenario }) => {
    const c = await novoCenario(); await preparar(c); const antes = await grafo(c);
    const caminhos = [`/cursos/${c.cursoId}`, `/disciplinas/${c.disciplinaId}`, `/curso-disciplina/${c.cursoDisciplinaId}`,
      `/periodos-letivos/${c.periodoLetivoId}`, `/turmas/${c.turmaId}`, `/turmas/${c.turmaId}/disciplinas/${c.turmaDisciplinaId}`];
    for (const caminho of caminhos) {
      const resposta = await c.apiSecretaria.del(caminho);
      expect(resposta.status, caminho).toBe(409);
      expect(JSON.stringify(resposta.body)).not.toMatch(/SQL|piv\.|stack|constraint/);
      expect(await grafo(c)).toEqual(antes);
    }
  });

  test("exclusão de avaliação desde a primeira nota zero retorna 409 sem perder marcadores", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c); const antes = await grafo(c);
    const resposta = await c.apiProfessor.del(`/avaliacoes/${f.avaliacaoId}`);
    expect(resposta.status).toBe(409); expect(resposta.body.codigo).toBe("AVALIACAO_COM_NOTA");
    expect(await grafo(c)).toEqual(antes);
    expect(antes.avaliacoes[0].primeira_nota_em).not.toBeNull();
    expect(antes.ofertas[0].pontuacao_vinculada_em).not.toBeNull(); expect(antes.regra.usada_em).not.toBeNull();
  });

  test("caminhos SQL alternativos não apagam matrícula, vínculo, nota ou histórico", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c); const antes = await grafo(c);
    const nota = antes.notas[0]; const audit = antes.auditorias[0];
    await sqlBloqueado(async (trx) => trx("piv.matricula").where({ id: f.matriculaId }).delete());
    await sqlBloqueado(async (trx) => trx("piv.matricula_turma_disciplina").where({ id: f.vinculoId }).delete());
    await sqlBloqueado(async (trx) => trx("piv.nota").where({ id: nota.id }).delete(), ["23514"]);
    await sqlBloqueado(async (trx) => trx("piv.nota_auditoria").where({ id: audit.id }).delete(), ["23514"]);
    await sqlBloqueado(async (trx) => trx("piv.nota_auditoria").where({ id: audit.id }).update({ valor_novo: "1.00" }), ["23514"]);
    await sqlBloqueado(async (trx) => trx("piv.nota").where({ id: nota.id }).update({ publicada_em: "2000-01-01T00:00:00Z" }), ["23514"]);
    expect(await grafo(c)).toEqual(antes);
    const guards = await db().raw("SELECT count(*)::int AS total FROM pg_trigger WHERE tgrelid IN ('piv.nota'::regclass,'piv.nota_auditoria'::regclass) AND NOT tgisinternal AND tgenabled <> 'D'");
    expect(guards.rows[0].total).toBeGreaterThanOrEqual(3);
  });

  test("vínculo de outra oferta e excesso de máximo são barrados no SQL sob guards ativos", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c, false);
    const outra = await novoCenario(); const outroAluno = await outra.matricularAluno();
    const outroVinculo = await db()("piv.matricula_turma_disciplina").where({ matricula_id: outroAluno.matriculaId }).first();
    const antes = await grafo(c);
    await sqlBloqueado(async (trx) => trx("piv.nota").insert({ avaliacao_id: f.avaliacaoId,
      matricula_turma_disciplina_id: outroVinculo.id, valor: "0.00" }), ["23514"]);
    await sqlBloqueado(async (trx) => trx("piv.nota").insert({ avaliacao_id: f.avaliacaoId,
      matricula_turma_disciplina_id: f.vinculoId, valor: "18.01" }), ["23514"]);
    expect(await grafo(c)).toEqual(antes);
    expect(antes.avaliacoes[0].primeira_nota_em).toBeNull();
  });

  test("lotes inválidos não criam nota, auditoria nem primeiro marcador", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c, false); const antes = await grafo(c);
    for (const valor of [1, null, "1.000", "18.01"]) {
      const resposta = await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, { body: { itens: [{ alunoId: f.aluno.id, valor }] } });
      expect(resposta.status).toBe(400); expect(resposta.body.codigo).toMatch(/VALOR_INVALIDO|PRECISAO_INVALIDA/);
      expect(await grafo(c)).toEqual(antes);
    }
  });

  test("quantidade e orçamento seguem íntegros após tentativa por API e SQL", async ({ novoCenario }) => {
    const c = await novoCenario(); await c.configurarRegra("120");
    const corpo = { tipo_avaliacao: "REGULAR", data_lancamento: "2026-09-28", data_devolucao: "2026-10-01",
      descricao_avaliacao: "Avaliação sintética de limite", valor: "18.00", turma_disciplina_id: c.turmaDisciplinaId,
      subgrupo_id: c.regraPontuacao!.subgrupos[0].id };
    for (let i = 0; i < 4; i++) expect((await c.apiProfessor.post("/avaliacoes", { body: corpo })).status).toBe(201);
    const antes = await grafo(c);
    const excedente = await c.apiProfessor.post("/avaliacoes", { body: corpo });
    expect(excedente.status).toBe(409);
    await sqlBloqueado(async (trx) => trx("piv.avaliacao").insert(corpo), ["23514"]);
    expect(await grafo(c)).toEqual(antes); expect(antes.avaliacoes).toHaveLength(4);
  });

  test("relançar não duplica nota e o fluxo conserva vínculos sem órfãos", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c);
    expect((await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, { body: { itens: [{ alunoId: f.aluno.id, valor: "18.00" }] } })).status).toBe(200);
    const atual = await grafo(c); expect(atual.notas).toHaveLength(1); expect(atual.auditorias).toHaveLength(2);
    expect(atual.notas[0].matricula_turma_disciplina_id).toBe(f.vinculoId);
    expect(atual.vinculos[0].matricula_id).toBe(f.matriculaId);
    expect(atual.matriculas[0].aluno_id).toBe(f.aluno.id);
  });
});
