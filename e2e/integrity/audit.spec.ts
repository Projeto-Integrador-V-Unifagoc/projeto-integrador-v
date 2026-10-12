import { test, expect } from "../fixtures/test.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import { db, exigirBancoDeTeste, fecharDb } from "../helpers/db.js";
import { cadastrarUsuario, login } from "../factories/usuario.factory.js";
import { registrarChamada, datasRecentes } from "../helpers/dominio.js";

test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());

async function preparar(c: Cenario) {
  await c.configurarRegra("120");
  const aluno = await c.matricularAluno();
  const resposta = await c.apiProfessor.post("/avaliacoes", { body: {
    tipo_avaliacao: "REGULAR", valor: "18.00", subgrupo_id: c.regraPontuacao!.subgrupos[0].id,
    turma_disciplina_id: c.turmaDisciplinaId, descricao_avaliacao: "Auditoria sintética T050",
    data_lancamento: "2026-09-28", data_devolucao: "2026-10-01",
  } });
  expect(resposta.status).toBe(201);
  const vinculo = await db()("piv.matricula_turma_disciplina").where({ matricula_id: aluno.matriculaId, turma_disciplina_id: c.turmaDisciplinaId }).first();
  return { ...aluno, avaliacaoId: String(resposta.body.id), vinculoId: String(vinculo.id) };
}
const lote = (alunoId: string, valor: string, motivo?: string) => ({ body: { itens: [{ alunoId, valor }], ...(motivo ? { motivo } : {}) } });
async function estado(avaliacaoId: string) {
  const notas = await db()("piv.nota").where({ avaliacao_id: avaliacaoId }).orderBy("id");
  const auditorias = await db()("piv.nota_auditoria").whereIn("nota_id", notas.map((n) => n.id)).orderBy(["criado_em", "id"]);
  const autorizacoes = await db()("piv.nota_autorizacao_excepcional").where({ avaliacao_id: avaliacaoId }).orderBy("id");
  const avaliacao = await db()("piv.avaliacao").where({ id: avaliacaoId }).first();
  return { notas, auditorias, autorizacoes, avaliacao };
}
async function inserirHistoricoVencido(c: Cenario, avaliacaoId: string, vinculoId: string) {
  const docente = await db()("piv.professor").where({ id: c.professor.id }).first("usuario_id");
  return db().transaction(async (trx) => {
    // História sintética própria: inserir publicação antiga e autor conhecido, sem UPDATE de timestamp.
    const [nota] = await trx("piv.nota").insert({ avaliacao_id: avaliacaoId, matricula_turma_disciplina_id: vinculoId,
      valor: "0.00", publicada_em: "2026-01-01T00:00:00Z", criada_por_usuario_id: docente.usuario_id,
      atualizada_por_usuario_id: docente.usuario_id }).returning("*");
    await trx("piv.nota_auditoria").insert({ nota_id: nota.id, usuario_id: docente.usuario_id, perfil: "professor",
      acao: "LANCAMENTO", valor_anterior: null, valor_novo: "0.00", motivo: "Histórico sintético T050", criado_em: nota.publicada_em });
    return nota;
  });
}

test.describe("Auditoria @integrity", () => {
  test("zero e máximo preservam nota, publicação, autor e valores da cadeia", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c);
    const zero = await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, lote(f.aluno.id, "0.00"));
    expect(zero.status).toBe(200);
    expect(zero.body.alunos.find((a: any) => a.alunoId === f.aluno.id)).toMatchObject({ valor: "0.00", lancada: true });
    const antes = await estado(f.avaliacaoId);
    const maximo = await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, lote(f.aluno.id, "18.00", "Corrigir transcrição documentada"));
    expect(maximo.status).toBe(200); expect(maximo.body.avaliacao.valorMaximo).toBe("18.00");
    const depois = await estado(f.avaliacaoId);
    expect(depois.notas).toHaveLength(1); expect(depois.notas[0].id).toBe(antes.notas[0].id);
    expect(depois.notas[0].publicada_em).toEqual(antes.notas[0].publicada_em);
    expect(depois.notas[0].criada_por_usuario_id).toBe(antes.notas[0].criada_por_usuario_id);
    expect(depois.auditorias).toHaveLength(2);
    expect(depois.auditorias[0]).toMatchObject({ perfil: "professor", acao: "LANCAMENTO", valor_anterior: null, valor_novo: "0.00" });
    expect(depois.auditorias[1]).toMatchObject({ perfil: "professor", acao: "RETIFICACAO", valor_anterior: "0.00", valor_novo: "18.00", motivo: "Corrigir transcrição documentada" });
    expect(new Date(depois.auditorias[0].criado_em).getTime()).toBeGreaterThanOrEqual(new Date(depois.notas[0].publicada_em).getTime());
    expect(depois.avaliacao.primeira_nota_em).toEqual(antes.avaliacao.primeira_nota_em);
  });

  test("professor, secretaria e administrador conservam perfil/ID originais na auditoria", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c);
    const docente = await db()("piv.professor").where({ id: c.professor.id }).first("usuario_id");
    const email = `${c.runId}-admin@example.test`; const senha = "SenhaSinteticaT050!";
    const administrador = await cadastrarUsuario(c.apiSecretaria, { nome: "Administrador sintético T050", email, senha, tipo_usuario: "administrador" });
    const token = await login(c.apiSecretaria.comToken(null), email, senha);
    const apiAdmin = c.apiSecretaria.comToken(token);
    expect((await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, lote(f.aluno.id, "0.00"))).status).toBe(200);
    expect((await c.apiSecretaria.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, lote(f.aluno.id, "5.00"))).status).toBe(200);
    expect((await apiAdmin.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, lote(f.aluno.id, "18.00"))).status).toBe(200);
    const atual = await estado(f.avaliacaoId);
    expect(atual.auditorias).toHaveLength(3);
    expect(atual.auditorias.map((a) => a.perfil)).toEqual(["professor", "secretaria", "administrador"]);
    expect(atual.auditorias[0].usuario_id).toBe(docente.usuario_id);
    expect(atual.auditorias[2].usuario_id).toBe(administrador.id);
    expect(atual.notas[0].criada_por_usuario_id).toBe(docente.usuario_id);
    expect(atual.notas[0].atualizada_por_usuario_id).toBe(administrador.id);
  });

  test("lote inválido conserva história e autorização; lote válido consome uma vez sem republicar", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c); const outro = await c.matricularAluno();
    const nota = await inserirHistoricoVencido(c, f.avaliacaoId, f.vinculoId);
    const vencido = await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, lote(f.aluno.id, "10.00"));
    expect(vencido.status).toBe(409); expect(vencido.body.codigo).toBe("PRAZO_EXPIRADO");
    const autorizacao = await c.apiSecretaria.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: f.avaliacaoId, motivo: "Retificação sintética autorizada" } });
    expect(autorizacao.status).toBe(201);
    const antes = await estado(f.avaliacaoId);
    const invalido = await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, { body: { itens: [
      { alunoId: f.aluno.id, valor: "10.00" }, { alunoId: outro.aluno.id, valor: "1.000" }] } });
    expect(invalido.status).toBe(400); expect(invalido.body.codigo).toBe("PRECISAO_INVALIDA");
    expect(await estado(f.avaliacaoId)).toEqual(antes);
    const valido = await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, { body: { itens: [
      { alunoId: f.aluno.id, valor: "10.00" }, { alunoId: outro.aluno.id, valor: "0.00" }] } });
    expect(valido.status).toBe(200);
    const depois = await estado(f.avaliacaoId);
    expect(depois.notas).toHaveLength(2); expect(depois.auditorias).toHaveLength(3);
    expect(depois.notas.find((n) => n.id === nota.id)!.publicada_em).toEqual(nota.publicada_em);
    expect(depois.autorizacoes).toHaveLength(1); expect(depois.autorizacoes[0].utilizada_em).not.toBeNull();
    expect(depois.auditorias.find((a) => a.acao === "RETIFICACAO")!.motivo).toBe("Retificação sintética autorizada");
    const repetido = await c.apiProfessor.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, lote(f.aluno.id, "11.00"));
    expect(repetido.status).toBe(409);
    expect(await estado(f.avaliacaoId)).toEqual(depois);
  });

  test("autorização vigente não reabre período encerrado e permanece sem consumo", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c);
    await inserirHistoricoVencido(c, f.avaliacaoId, f.vinculoId);
    expect((await c.apiSecretaria.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: f.avaliacaoId, matriculaTurmaDisciplinaId: f.vinculoId, motivo: "Correção sintética autorizada" } })).status).toBe(201);
    expect((await c.apiSecretaria.put(`/periodos-letivos/${c.periodoLetivoId}`, { body: { status: "encerrado" } })).status).toBe(200);
    const antes = await estado(f.avaliacaoId);
    const resposta = await c.apiSecretaria.put(`/notas/avaliacoes/${f.avaliacaoId}/lote`, lote(f.aluno.id, "18.00"));
    expect(resposta.status).toBe(409); expect(resposta.body.codigo).toBe("PERIODO_FECHADO");
    expect(await estado(f.avaliacaoId)).toEqual(antes);
    expect(antes.autorizacoes[0].utilizada_em).toBeNull();
  });

  test("autorização não aceita vínculo de outra oferta nem expõe detalhes alheios", async ({ novoCenario }) => {
    const c = await novoCenario(); const f = await preparar(c);
    const outra = await novoCenario(); const outroAluno = await outra.matricularAluno();
    const vinculo = await db()("piv.matricula_turma_disciplina").where({ matricula_id: outroAluno.matriculaId }).first();
    const resposta = await c.apiSecretaria.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: f.avaliacaoId, matriculaTurmaDisciplinaId: vinculo.id, motivo: "Correção de vínculo inválido" } });
    expect(resposta.status).toBe(400); expect(resposta.body.codigo).toBe("LOTE_INVALIDO");
    expect(JSON.stringify(resposta.body)).not.toContain(vinculo.id);
    expect(JSON.stringify(resposta.body)).not.toMatch(/SQL|piv\.|stack|constraint/);
    expect(await db()("piv.nota_autorizacao_excepcional").where({ avaliacao_id: f.avaliacaoId })).toEqual([]);
  });

  test("lançamento de frequência gera frequencia_auditoria", async ({ novoCenario }) => {
    const c = await novoCenario(); const { aluno } = await c.matricularAluno(); const [data] = datasRecentes(1);
    const chamada = await registrarChamada(c.apiProfessor, c.turmaDisciplinaId, data, [{ alunoId: aluno.id, status: "PRESENTE" }]);
    const auditorias = await db()("piv.frequencia_auditoria").where({ frequencia_id: chamada.body.registros[0].id });
    expect(auditorias.length).toBeGreaterThanOrEqual(1);
    expect(auditorias[0]).toMatchObject({ perfil: "professor", acao: expect.any(String), usuario_id: expect.any(String) });
    expect(auditorias[0].dados_novos).toBeTruthy();
  });
});
