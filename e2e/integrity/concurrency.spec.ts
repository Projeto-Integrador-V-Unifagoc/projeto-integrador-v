import type { Knex } from "knex";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestInfo } from "@playwright/test";
import { test, expect } from "../fixtures/test.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import type { Resposta } from "../helpers/api.js";
import { pegarCidade, db, garantirLocal, exigirBancoDeTeste, fecharDb } from "../helpers/db.js";
import { criarAluno } from "../factories/aluno.factory.js";
import { datasRecentes } from "../helpers/dominio.js";
import { disputarComBloqueioAcademico } from "../../backend/src/test-helpers/disputaAcademica";

test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());

function dadosAvaliacao(c: Cenario) {
  return { tipo_avaliacao: "REGULAR", data_lancamento: "2026-09-28", data_devolucao: "2026-10-01",
    descricao_avaliacao: "Avaliação sintética T050", valor: "18.00", turma_disciplina_id: c.turmaDisciplinaId,
    subgrupo_id: c.regraPontuacao!.subgrupos[0].id };
}
async function preparar(c: Cenario) {
  await c.configurarRegra("120");
  const { aluno, matriculaId } = await c.matricularAluno();
  const resposta = await c.apiProfessor.post("/avaliacoes", { body: dadosAvaliacao(c) });
  expect(resposta.status).toBe(201);
  const vinculo = await db()("piv.matricula_turma_disciplina").where({ matricula_id: matriculaId, turma_disciplina_id: c.turmaDisciplinaId }).first();
  return { aluno, matriculaId, vinculoId: String(vinculo.id), avaliacaoId: String(resposta.body.id) };
}
const itens = (alunoId: string, valor: string) => ({ body: { itens: [{ alunoId, valor }] } });

async function disputar(testInfo: TestInfo, bloquear: (trx: Knex.Transaction) => Promise<void>, operacoes: Array<() => Promise<Resposta>>) {
  const evidencia = await disputarComBloqueioAcademico(db(), bloquear, operacoes);
  expect(evidencia.bloqueios).toHaveLength(operacoes.length);
  expect(evidencia.bloqueios.every((b) => b.cadeiaAteBloqueador.includes(evidencia.bloqueadorPid))).toBe(true);
  const diretorio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../specs/001-notas-dinamicas/evidencias-concorrencia");
  await mkdir(diretorio, { recursive: true });
  const slug = testInfo.title.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
  const arquivo = path.join(diretorio, `t050-${slug}.json`);
  await writeFile(arquivo, JSON.stringify({ cenario: testInfo.title, executadaEm: new Date().toISOString(),
    fonte: "e2e/integrity/concurrency.spec.ts", bloqueadorPid: evidencia.bloqueadorPid,
    consultas: evidencia.consultas, bloqueios: evidencia.bloqueios,
    resultados: evidencia.resultados.map((r) => r.status === "fulfilled" ? { status: r.value.status, codigo: r.value.body?.codigo ?? null } : { falhou: true }),
  }, null, 2));
  await testInfo.attach("esperas-postgresql", { path: arquivo, contentType: "application/json" });
  return evidencia.resultados.map((r) => { if (r.status === "rejected") throw r.reason; return r.value; });
}
async function historico(avaliacaoId: string) {
  const notas = await db()("piv.nota").where({ avaliacao_id: avaliacaoId });
  const auditorias = await db()("piv.nota_auditoria").whereIn("nota_id", notas.map((n) => n.id)).orderBy(["criado_em", "id"]);
  const avaliacao = await db()("piv.avaliacao").where({ id: avaliacaoId }).first();
  return { notas, auditorias, avaliacao };
}
async function notaVencida(c: Cenario, avaliacaoId: string, vinculoId: string) {
  const docente = await db()("piv.professor").where({ id: c.professor.id }).first("usuario_id");
  return db().transaction(async (trx) => {
    // Pré-condição histórica sintética inserida com autor conhecido; publicação nunca é UPDATE.
    const [nota] = await trx("piv.nota").insert({ avaliacao_id: avaliacaoId, matricula_turma_disciplina_id: vinculoId,
      valor: "0.00", publicada_em: "2026-01-01T00:00:00Z", criada_por_usuario_id: docente.usuario_id,
      atualizada_por_usuario_id: docente.usuario_id }).returning("*");
    await trx("piv.nota_auditoria").insert({ nota_id: nota.id, usuario_id: docente.usuario_id, perfil: "professor",
      acao: "LANCAMENTO", valor_anterior: null, valor_novo: "0.00", motivo: "Histórico sintético T050", criado_em: nota.publicada_em });
    return nota;
  });
}

test.describe("Concorrência @integrity", () => {
  test("mesma matrícula simultânea: apenas uma é criada", async ({ novoCenario }) => {
    const c = await novoCenario();
    const cidade = await pegarCidade();
    const aluno = await criarAluno(c.apiSecretaria, `${c.runId}c`, { cursoId: c.cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf });
    const corpo = { body: { alunoId: aluno.id, turmaId: c.turmaId } };
    const respostas = await Promise.all([c.apiSecretaria.post("/matriculas", corpo), c.apiSecretaria.post("/matriculas", corpo)]);
    expect(respostas.filter((r) => r.status === 201)).toHaveLength(1);
  });

  test("última vaga de avaliação respeita quantidade e orçamento @barreira", async ({ novoCenario }, testInfo) => {
    const c = await novoCenario(); await c.configurarRegra("120");
    const corpo = { body: dadosAvaliacao(c) };
    for (let i = 0; i < 3; i++) expect((await c.apiProfessor.post("/avaliacoes", corpo)).status).toBe(201);
    const respostas = await disputar(testInfo, async (trx) => { await trx("piv.periodo_letivo").where({ id: c.periodoLetivoId }).forUpdate(); },
      [() => c.apiProfessor.post("/avaliacoes", corpo), () => c.apiProfessor.post("/avaliacoes", corpo)]);
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
    const avaliacoes = await db()("piv.avaliacao").where({ turma_disciplina_id: c.turmaDisciplinaId });
    expect(avaliacoes).toHaveLength(4);
    expect(avaliacoes.map((a) => a.valor)).toEqual(["18.00", "18.00", "18.00", "18.00"]);
    expect(respostas.find((r) => r.status === 409)!.body.codigo).toMatch(/QUANTIDADE|ORCAMENTO/);
  });

  test("dois lotes da mesma avaliação produzem uma nota e cadeia auditada @barreira", async ({ novoCenario }, testInfo) => {
    const c = await novoCenario(); const f = await preparar(c);
    const respostas = await disputar(testInfo, async (trx) => { await trx("piv.periodo_letivo").where({ id: c.periodoLetivoId }).forUpdate(); },
      [() => c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, itens(f.aluno.id, "0.00")),
        () => c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, itens(f.aluno.id, "18.00"))]);
    expect(respostas.map((r) => r.status)).toEqual([200, 200]);
    const atual = await historico(f.avaliacaoId);
    expect(atual.notas).toHaveLength(1); expect(atual.auditorias).toHaveLength(2);
    expect(atual.auditorias.map((a) => a.acao)).toEqual(["LANCAMENTO", "RETIFICACAO"]);
    expect(atual.auditorias[0].valor_anterior).toBeNull();
    expect(atual.auditorias[1].valor_anterior).toBe(atual.auditorias[0].valor_novo);
    expect(atual.auditorias[1].valor_novo).toBe(atual.notas[0].valor);
    expect(["0.00", "18.00"]).toContain(atual.notas[0].valor);
    expect(atual.avaliacao.primeira_nota_em).not.toBeNull();
  });

  for (const pai of ["período", "matrícula", "docente"] as const) {
    test(`lote versus alteração de ${pai} revalida estado protegido @barreira`, async ({ novoCenario }, testInfo) => {
      const c = await novoCenario(); const f = await preparar(c);
      const tabela = pai === "período" ? "piv.periodo_letivo" : pai === "matrícula" ? "piv.matricula" : "piv.professor";
      const id = pai === "período" ? c.periodoLetivoId : pai === "matrícula" ? f.matriculaId : c.professor.id;
      const alterar = () => pai === "período"
        ? c.apiSecretaria.put(`/periodos-letivos/${id}`, { body: { status: "encerrado" } })
        : pai === "matrícula" ? c.apiSecretaria.patch(`/matriculas/${id}/status`, { body: { status: "cancelada" } })
          : c.apiSecretaria.del(`/professores/${id}`);
      const respostas = await disputar(testInfo, async (trx) => { await trx(tabela).where({ id }).forUpdate(); },
        [() => c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, itens(f.aluno.id, "0.00")), alterar]);
      expect(respostas[1].status).toBe(pai === "docente" ? 204 : 200);
      expect([200, 400, 403, 409]).toContain(respostas[0].status);
      const atual = await historico(f.avaliacaoId);
      expect(atual.notas).toHaveLength(respostas[0].status === 200 ? 1 : 0);
      expect(atual.auditorias).toHaveLength(atual.notas.length);
      const rejeitada = await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, itens(f.aluno.id, "1.00"));
      expect(pai === "período" ? [409] : pai === "matrícula" ? [400, 403] : [403]).toContain(rejeitada.status);
      expect(await historico(f.avaliacaoId)).toEqual(atual);
    });
  }

  test("autorização de prazo única não atende dois lotes vencidos @barreira", async ({ novoCenario }, testInfo) => {
    const c = await novoCenario(); const f = await preparar(c);
    const nota = await notaVencida(c, f.avaliacaoId, f.vinculoId);
    const permissao = await c.apiSecretaria.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: f.avaliacaoId, motivo: "Correção sintética autorizada" } });
    expect(permissao.status).toBe(201);
    const respostas = await disputar(testInfo, async (trx) => { await trx("piv.periodo_letivo").where({ id: c.periodoLetivoId }).forUpdate(); },
      [() => c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, itens(f.aluno.id, "10.00")),
        () => c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, itens(f.aluno.id, "12.00"))]);
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(respostas.find((r) => r.status === 409)!.body.codigo).toBe("PRAZO_EXPIRADO");
    const atual = await historico(f.avaliacaoId);
    expect(atual.notas).toHaveLength(1); expect(atual.notas[0].id).toBe(nota.id);
    expect(new Date(atual.notas[0].publicada_em).toISOString()).toBe(new Date(nota.publicada_em).toISOString());
    expect(atual.auditorias).toHaveLength(2);
    const auth = await db()("piv.nota_autorizacao_excepcional").where({ id: permissao.body.autorizacao.id }).first();
    expect(auth.utilizada_em).not.toBeNull();
  });

  test("lote inválido disputado não escreve nem consome parcialmente @barreira", async ({ novoCenario }, testInfo) => {
    const c = await novoCenario(); const f = await preparar(c); const outro = await c.matricularAluno();
    await notaVencida(c, f.avaliacaoId, f.vinculoId);
    const permissao = await c.apiSecretaria.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: f.avaliacaoId, motivo: "Correção sintética autorizada" } });
    expect(permissao.status).toBe(201);
    const respostas = await disputar(testInfo, async (trx) => { await trx("piv.periodo_letivo").where({ id: c.periodoLetivoId }).forUpdate(); },
      [() => c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, { body: { itens: [
        { alunoId: f.aluno.id, valor: "11.00" }, { alunoId: outro.aluno.id, valor: "18.001" }] } }),
        () => c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, itens(f.aluno.id, "12.00"))]);
    expect(respostas.map((r) => r.status)).toEqual([400, 200]);
    expect(respostas[0].body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ campo: "itens[1].valor" })]));
    const atual = await historico(f.avaliacaoId);
    expect(atual.notas).toHaveLength(1); expect(atual.notas[0].valor).toBe("12.00");
    expect(atual.auditorias).toHaveLength(2); expect(atual.auditorias[1].valor_novo).toBe("12.00");
  });

  test("última vaga: apenas uma matrícula vence", async ({ novoCenario }) => {
    const c = await novoCenario({ capacidadeTurma: 1 }); const cidade = await pegarCidade();
    const [a, b] = await Promise.all(["a", "b"].map((s) => criarAluno(c.apiSecretaria, `${c.runId}${s}`,
      { cursoId: c.cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf })));
    const respostas = await Promise.all([a, b].map((aluno) => c.apiSecretaria.post("/matriculas", { body: { alunoId: aluno.id, turmaId: c.turmaId } })));
    expect(respostas.filter((r) => r.status === 201)).toHaveLength(1);
  });

  test("duas chamadas na mesma data não duplicam a aula", async ({ novoCenario }) => {
    const c = await novoCenario(); const { aluno } = await c.matricularAluno();
    const localId = await garantirLocal("E2E-LOCAL"); const [data] = datasRecentes(1);
    const corpo = { body: { turmaDisciplinaId: c.turmaDisciplinaId, data, localId, registros: [{ alunoId: aluno.id, status: "PRESENTE" }] } };
    await Promise.all([c.apiProfessor.post("/frequencias", corpo), c.apiProfessor.post("/frequencias", corpo)]);
    const aulas = await db()("piv.aula").where({ turma_disciplina_id: c.turmaDisciplinaId });
    expect(aulas).toHaveLength(1);
  });
});
