import { test, expect } from "../fixtures/test.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import type { RegraPontuacaoCriada } from "../factories/regra-pontuacao.factory.js";
import { criarProfessorComLogin } from "../factories/professor.factory.js";
import { db, exigirBancoDeTeste, fecharDb } from "../helpers/db.js";

test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());
const dados = (c: Cenario, r: RegraPontuacaoCriada, valor = "18.00", grupo = 0, oferta = c.turmaDisciplinaId) => ({
  tipo_avaliacao: "REGULAR", subgrupo_id: r.subgrupos[grupo].id, valor, turma_disciplina_id: oferta,
  descricao_avaliacao: "Avaliação sintética de API", data_lancamento: "2026-09-28", data_devolucao: "2026-10-01",
});
async function criar(c: Cenario, r: RegraPontuacaoCriada, valor = "18.00", grupo = 0, oferta = c.turmaDisciplinaId) {
  const res = await c.apiProfessor.post("/avaliacoes", { body: dados(c, r, valor, grupo, oferta) });
  expect(res.status).toBe(201);
  expect(res.body.valor).toBe(valor);
  expect(res.body.regraPontuacaoId).toBe(r.id);
  return String(res.body.id);
}
const salvar = (c: Cenario, id: string, itens: Array<{ alunoId: string; valor: unknown }>) =>
  c.apiProfessor.put(`/notas/avaliacoes/${id}/lote`, { body: { itens } });

test.describe("US2: plano e avaliações variáveis @api", () => {
  test("não presume regra no cadastro de uma oferta nova", async ({ novoCenario }) => {
    const c = await novoCenario();
    const res = await c.apiProfessor.post("/avaliacoes", { body: { turma_disciplina_id: c.turmaDisciplinaId,
      valor: "18.00", data_lancamento: "2026-09-28", subgrupo_id: "11111111-1111-4111-8111-111111111111" } });
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe("REGRA_AUSENTE");
    expect(await db()("piv.avaliacao").where({ turma_disciplina_id: c.turmaDisciplinaId })).toEqual([]);
  });
  test("máximos12/18/18/24 completam fixa4; demais grupos são independentes", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120");
    for (const valor of ["12.00", "18.00", "18.00", "24.00"]) await criar(c, r, valor);
    await criar(c, r, "6.00", 1);
    await criar(c, r, "10.00", 2); await criar(c, r, "32.00", 2);
    const plano = await c.apiProfessor.get(`/avaliacoes/plano/${c.turmaDisciplinaId}`);
    expect(plano.status).toBe(200);
    expect(plano.body.planoCompleto).toBe(true);
    expect(plano.body.subgrupos.map((g: any) => g.saldoPontos)).toEqual(["0.00", "0.00", "0.00"]);
    expect(plano.body.subgrupos[2]).toMatchObject({ quantidadeAtual: 2, quantidadeFixa: null, quantidadeDisponivel: null });
  });
  test("saldo zerado com quantidade fixa incompleta não completa o plano", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120");
    await criar(c, r, "72.00"); await criar(c, r, "6.00", 1); await criar(c, r, "42.00", 2);
    const plano = await c.apiProfessor.get(`/avaliacoes/plano/${c.turmaDisciplinaId}`);
    expect(plano.body.planoCompleto).toBe(false);
    expect(plano.body.subgrupos[0]).toMatchObject({ saldoPontos: "0.00", quantidadeAtual: 1, quantidadeDisponivel: 3 });
  });
  test("quantidade e orçamento produzem conflitos distintos sem escrita parcial", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120");
    for (let i = 0; i < 4; i++) await criar(c, r, "1.00");
    const quantidade = await c.apiProfessor.post("/avaliacoes", { body: dados(c, r, "1.00") });
    expect(quantidade.status).toBe(409); expect(quantidade.body.codigo).toMatch(/QUANTIDADE/);
    const orcamento = await c.apiProfessor.post("/avaliacoes", { body: dados(c, r, "42.01", 2) });
    expect(orcamento.status).toBe(409); expect(orcamento.body.codigo).toMatch(/ORCAMENTO/);
    expect(await db()("piv.avaliacao").where({ turma_disciplina_id: c.turmaDisciplinaId })).toHaveLength(4);
  });
  test("movimento que excede orçamento do destino conserva a origem", async ({ novoCenario, runId }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120");
    const irma = await c.criarOfertaIrma(`${runId}i`);
    const id = await criar(c, r, "18.00"); await criar(c, r, "72.00", 0, irma.turmaDisciplinaId);
    const antes = await db()("piv.avaliacao").where({ id }).first();
    const res = await c.apiProfessor.put(`/avaliacoes/${id}`, { body: { turma_disciplina_id: irma.turmaDisciplinaId } });
    expect(res.status).toBe(409); expect(res.body.codigo).toMatch(/ORCAMENTO/);
    expect(await db()("piv.avaliacao").where({ id }).first()).toEqual(antes);
  });
  test("CRUD antes da nota conserva marca institucional após exclusão", async ({ novoCenario, runId }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120");
    const irma = await c.criarOfertaIrma(`${runId}i`); const id = await criar(c, r, "10.00", 2);
    expect((await c.apiProfessor.get(`/avaliacoes/${id}`)).status).toBe(200);
    expect((await c.apiProfessor.put(`/avaliacoes/${id}`, { body: { valor: "15.00", turma_disciplina_id: irma.turmaDisciplinaId } })).status).toBe(200);
    expect((await c.apiProfessor.del(`/avaliacoes/${id}`)).status).toBe(204);
    const regra = await c.apiSecretaria.get(`/regras-pontuacao/cursos/${c.cursoId}/periodos/${c.periodoLetivoId}`);
    expect(regra.body.estado).toBe("PRESERVADA");
    for (const ofertaId of [c.turmaDisciplinaId, irma.turmaDisciplinaId]) {
      expect((await db()("piv.turma_disciplina").where({ id: ofertaId }).first()).regra_pontuacao_id).toBe(r.id);
    }
  });
  test("professor alheio não cadastra nem move para destino alheio", async ({ novoCenario, runId }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120");
    const outro = await criarProfessorComLogin(c.apiSecretaria, `${runId}p`, { cursoId: c.cursoId, cidadeIbge: c.cidade.ibge, uf: c.cidade.uf });
    const apiOutro = c.apiSecretaria.comToken(outro.token);
    expect((await apiOutro.post("/avaliacoes", { body: dados(c, r) })).status).toBe(403);
    const irma = await c.criarOfertaIrma(`${runId}i`);
    expect((await c.apiSecretaria.put(`/turmas/${irma.turmaId}/disciplinas/${irma.turmaDisciplinaId}`, { body: { professorId: outro.professor.id } })).status).toBe(200);
    const id = await criar(c, r); const antes = await db()("piv.avaliacao").where({ id }).first();
    const res = await c.apiProfessor.put(`/avaliacoes/${id}`, { body: { turma_disciplina_id: irma.turmaDisciplinaId } });
    expect(res.status).toBe(403); expect(res.body).not.toHaveProperty("professor_id");
    expect(await db()("piv.avaliacao").where({ id }).first()).toEqual(antes);
  });
  test("RECUPERACAO não usa POST regular e datas inválidas são rejeitadas", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120");
    for (const alteracoes of [{ tipo_avaliacao: "RECUPERACAO" }, { data_lancamento: "2026-02-30" }, { data_devolucao: "2026-09-01" }]) {
      const res = await c.apiProfessor.post("/avaliacoes", { body: { ...dados(c, r), ...alteracoes } });
      expect(res.status).toBe(400); expect(res.body.campos).toEqual(expect.any(Array));
    }
  });
});

test.describe("US2: lote textual, publicação e retificação @api", () => {
  test("zero, máximo e ausência são distintos; plano incompleto permite nota regular", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120"); const id = await criar(c, r, "24.00");
    const a = await c.matricularAluno(); const b = await c.matricularAluno(); const ausente = await c.matricularAluno();
    const res = await salvar(c, id, [{ alunoId: a.aluno.id, valor: "0.00" }, { alunoId: b.aluno.id, valor: "24.00" }]);
    expect(res.status).toBe(200);
    const grade = await c.apiProfessor.get(`/notas/avaliacoes/${id}/lancamento`);
    expect(grade.body.avaliacao.valorMaximo).toBe("24.00");
    expect(grade.body.alunos.find((x: any) => x.alunoId === a.aluno.id)).toMatchObject({ valor: "0.00", lancada: true });
    expect(grade.body.alunos.find((x: any) => x.alunoId === b.aluno.id).valor).toBe("24.00");
    expect(grade.body.alunos.find((x: any) => x.alunoId === ausente.aluno.id)).toMatchObject({ valor: null, lancada: false });
    expect((await db()("piv.avaliacao").where({ id }).first()).primeira_nota_em).not.toBeNull();
  });
  test("lote inválido conserva nota anterior, auditoria e marcador", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120"); const id = await criar(c, r);
    const a = await c.matricularAluno(); const b = await c.matricularAluno();
    expect((await salvar(c, id, [{ alunoId: a.aluno.id, valor: "10.00" }])).status).toBe(200);
    const antes = await db()("piv.nota").where({ avaliacao_id: id });
    const audits = await db()("piv.nota_auditoria").whereIn("nota_id", antes.map((n: any) => n.id));
    const marcador = (await db()("piv.avaliacao").where({ id }).first()).primeira_nota_em;
    const res = await salvar(c, id, [{ alunoId: a.aluno.id, valor: "11.00" }, { alunoId: b.aluno.id, valor: "18.01" }]);
    expect(res.status).toBe(400); expect(res.body.campos).toEqual(expect.any(Array));
    expect(await db()("piv.nota").where({ avaliacao_id: id })).toEqual(antes);
    expect(await db()("piv.nota_auditoria").whereIn("nota_id", antes.map((n: any) => n.id))).toEqual(audits);
    expect((await db()("piv.avaliacao").where({ id }).first()).primeira_nota_em).toEqual(marcador);
  });
  for (const [rotulo, valor] of [["negativo", "-0.01"], ["excesso", "18.01"], ["precisão", "1.001"], ["número JSON", 1], ["vazio", ""], ["expoente", "1e1"], ["vírgula REST", "1,00"], ["sufixo", "1x"], ["null", null]] as const) {
    test(`rejeita ${rotulo} sem nota ou primeiro marcador`, async ({ novoCenario }) => {
      const c = await novoCenario(); const r = await c.configurarRegra("120"); const id = await criar(c, r); const a = await c.matricularAluno();
      const res = await salvar(c, id, [{ alunoId: a.aluno.id, valor }]);
      expect(res.status).toBe(400); expect(res.body.campos).toEqual(expect.any(Array));
      expect(await db()("piv.nota").where({ avaliacao_id: id })).toEqual([]);
      expect((await db()("piv.avaliacao").where({ id }).first()).primeira_nota_em).toBeNull();
    });
  }
  test("aluno repetido ou matrícula cancelada invalida o lote inteiro", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120"); const id = await criar(c, r); const a = await c.matricularAluno();
    expect((await salvar(c, id, [{ alunoId: a.aluno.id, valor: "1.00" }, { alunoId: a.aluno.id, valor: "2.00" }])).status).toBe(400);
    expect((await c.apiSecretaria.patch(`/matriculas/${a.matriculaId}/cancelar`, { body: {} })).status).toBe(200);
    expect((await salvar(c, id, [{ alunoId: a.aluno.id, valor: "1.00" }])).status).toBe(400);
    expect(await db()("piv.nota").where({ avaliacao_id: id })).toEqual([]);
  });
  test("primeira nota zero congela estrutura mas permite descrição e datas", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120"); const id = await criar(c, r); const a = await c.matricularAluno();
    expect((await salvar(c, id, [{ alunoId: a.aluno.id, valor: "0.00" }])).status).toBe(200);
    for (const body of [{ valor: "19.00" }, { subgrupo_id: r.subgrupos[2].id }, { tipo_avaliacao: "TPI" }]) {
      const res = await c.apiProfessor.put(`/avaliacoes/${id}`, { body });
      expect(res.status).toBe(409); expect(res.body.codigo).toBe("AVALIACAO_COM_NOTA");
    }
    expect((await c.apiProfessor.del(`/avaliacoes/${id}`)).status).toBe(409);
    expect((await c.apiProfessor.put(`/avaliacoes/${id}`, { body: { descricao_avaliacao: "Descrição corrigida", data_devolucao: "2026-10-02" } })).status).toBe(200);
    expect((await db()("piv.nota").where({ avaliacao_id: id }).first()).valor).toBe("0.00");
  });
  test("administrador conserva perfil na auditoria de lançamento e retificação", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120"); const id = await criar(c, r); const a = await c.matricularAluno();
    const { cadastrarUsuario, login } = await import("../factories/usuario.factory.js");
    const email = `admin-${c.runId}@example.test`; const senha = "Fixture@Admin2026!";
    await cadastrarUsuario(c.apiSecretaria, { nome: "Admin sintético", email, senha, tipo_usuario: "administrador" });
    const apiAdmin = c.apiSecretaria.comToken(await login(c.apiSecretaria, email, senha));
    for (const valor of ["0.00", "18.00"]) expect((await apiAdmin.put(`/notas/avaliacoes/${id}/lote`, { body: { itens: [{ alunoId: a.aluno.id, valor }] } })).status).toBe(200);
    const nota = await db()("piv.nota").where({ avaliacao_id: id }).first();
    const audits = await db()("piv.nota_auditoria").where({ nota_id: nota.id }).orderBy("criado_em");
    expect(audits).toHaveLength(2); expect(audits.map((x: any) => x.perfil)).toEqual(["administrador", "administrador"]);
    expect(audits[1]).toMatchObject({ valor_anterior: "0.00", valor_novo: "18.00", acao: "RETIFICACAO" });
    expect(nota.publicada_em).toBeTruthy();
  });
  test("período encerrado bloqueia nota e autorização excepcional", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120"); const id = await criar(c, r); const a = await c.matricularAluno();
    expect((await c.apiSecretaria.put(`/periodos-letivos/${c.periodoLetivoId}`, { body: { status: "encerrado" } })).status).toBe(200);
    expect((await salvar(c, id, [{ alunoId: a.aluno.id, valor: "1.00" }])).status).toBe(409);
    expect((await c.apiSecretaria.post("/notas/autorizacoes-excepcionais", { body: { avaliacaoId: id, motivo: "Retificação sintética autorizada" } })).status).toBe(409);
    expect(await db()("piv.nota").where({ avaliacao_id: id })).toEqual([]);
  });
  test("professor não concede autorização; gestor exige motivo válido", async ({ novoCenario }) => {
    const c = await novoCenario(); const r = await c.configurarRegra("120"); const id = await criar(c, r);
    expect((await c.apiProfessor.post("/notas/autorizacoes-excepcionais", { body: { avaliacaoId: id, motivo: "Retificação sintética autorizada" } })).status).toBe(403);
    expect((await c.apiSecretaria.post("/notas/autorizacoes-excepcionais", { body: { avaliacaoId: id, motivo: "x" } })).status).toBe(400);
    const res = await c.apiSecretaria.post("/notas/autorizacoes-excepcionais", { body: { avaliacaoId: id, motivo: "Retificação sintética autorizada" } });
    expect(res.status).toBe(201);
    expect((await db()("piv.nota_autorizacao_excepcional").where({ avaliacao_id: id }).first()).motivo).toBe("Retificação sintética autorizada");
  });
});
