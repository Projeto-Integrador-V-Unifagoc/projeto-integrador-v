import { randomUUID } from "node:crypto";
import { test, expect } from "../fixtures/test.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import { dadosRegraPontuacao, type RegraPontuacaoCriada } from "../factories/regra-pontuacao.factory.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";
import { criarProfessorComLogin } from "../factories/professor.factory.js";
import { cadastrarUsuario, login } from "../factories/usuario.factory.js";
import { contar, db, exigirBancoDeTeste, fecharDb } from "../helpers/db.js";
import * as ids from "../helpers/ids.js";
import type { Resposta } from "../helpers/api.js";

// Cada cenário cria seu grafo. Este arquivo nunca limpa tabelas compartilhadas.
test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());

function caminho(cenario: Cenario, periodoId = cenario.periodoLetivoId) {
  return `/regras-pontuacao/cursos/${cenario.cursoId}/periodos/${periodoId}`;
}

function caminhoPlano(ofertaId: string) {
  return `/avaliacoes/plano/${ofertaId}`;
}

function edicao(regra: RegraPontuacaoCriada) {
  return {
    versaoEsperada: regra.versao,
    totalPontos: regra.totalPontos,
    subgrupos: regra.subgrupos.map((grupo) => ({ ...grupo })),
  };
}

function erroSeguro(resposta: Resposta, status: number, codigo: string) {
  expect(resposta.status).toBe(status);
  expect(resposta.body).toMatchObject({ codigo, mensagem: expect.any(String) });
  expect(resposta.body).not.toHaveProperty("stack");
  expect(resposta.body).not.toHaveProperty("sql");
}

/** Pré-condição sintética da US1, sem depender do escritor regular ainda em US2. */
async function inserirAvaliacao(
  cenario: Cenario,
  regra: RegraPontuacaoCriada,
  ofertaId = cenario.turmaDisciplinaId,
  valor = "18.00",
) {
  exigirBancoDeTeste();
  const id = randomUUID();
  await db()("piv.avaliacao").insert({
    id,
    turma_disciplina_id: ofertaId,
    subgrupo_id: regra.subgrupos[0].id,
    tipo_avaliacao: "REGULAR",
    descricao_avaliacao: "Pré-condição sintética de pontuação",
    data_lancamento: "2026-09-28T12:00:00.000Z",
    data_devolucao: "2026-10-01",
    valor,
  });
  return id;
}

test.describe("Configuração institucional e plano de pontuação @api", () => {
  test("regra ausente retorna404 e plano bloqueado sem total padrão", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const consulta = await cenario.apiSecretaria.get(caminho(cenario));
    erroSeguro(consulta, 404, "REGRA_AUSENTE");

    const plano = await cenario.apiProfessor.get(caminhoPlano(cenario.turmaDisciplinaId));
    expect(plano.status).toBe(200);
    expect(plano.body).toMatchObject({
      turmaDisciplinaId: cenario.turmaDisciplinaId,
      regraPontuacaoId: null,
      totalPontos: null,
      planoCompleto: false,
      podeCriarRegular: false,
      motivosBloqueio: ["REGRA_AUSENTE"],
      subgrupos: [],
    });
  });

  test("secretaria configura120 e professor consulta a composição e o plano completos", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const regra = await cenario.configurarRegra("120");
    const consulta = await cenario.apiProfessor.get(caminho(cenario));
    expect(consulta.status).toBe(200);
    expect(consulta.body).toMatchObject({
      id: regra.id, cursoId: cenario.cursoId, periodoLetivoId: cenario.periodoLetivoId,
      totalPontos: "120.00", origem: "CONFIGURADA", versao: 1,
      estado: "DISPONIVEL", usadaEm: null,
      criadaEm: expect.any(String), atualizadaEm: expect.any(String),
      criadaPorUsuarioId: expect.any(String), atualizadaPorUsuarioId: expect.any(String),
    });
    expect(consulta.body.subgrupos).toEqual(regra.subgrupos);

    const plano = await cenario.apiProfessor.get(caminhoPlano(cenario.turmaDisciplinaId));
    expect(plano.status).toBe(200);
    expect(plano.body).toMatchObject({
      turmaDisciplinaId: cenario.turmaDisciplinaId, regraPontuacaoId: regra.id,
      totalPontos: "120.00", planoCompleto: false, podeCriarRegular: true,
    });
    expect(plano.body.subgrupos).toEqual([
      { ...regra.subgrupos[0], pontosDistribuidos: "0.00", saldoPontos: "72.00", quantidadeAtual: 0, quantidadeDisponivel: 4, completo: false },
      { ...regra.subgrupos[1], pontosDistribuidos: "0.00", saldoPontos: "6.00", quantidadeAtual: 0, quantidadeDisponivel: 1, completo: false },
      { ...regra.subgrupos[2], pontosDistribuidos: "0.00", saldoPontos: "42.00", quantidadeAtual: 0, quantidadeDisponivel: null, completo: false },
    ].map(({ ordem: _ordem, ...grupo }) => grupo));
  });

  test("edição antes do uso conserva UUIDs e incrementa a versão", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const regra = await cenario.configurarRegra("120");
    const dados = edicao(regra);
    dados.subgrupos[0].orcamentoPontos = "70.00";
    dados.subgrupos[2].orcamentoPontos = "44.00";
    const resposta = await cenario.apiSecretaria.put(caminho(cenario), { body: dados });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: regra.id, versao: 2, estado: "DISPONIVEL", usadaEm: null, totalPontos: "120.00" });
    expect(resposta.body.subgrupos.map((grupo: { id: string }) => grupo.id)).toEqual(regra.subgrupos.map((grupo) => grupo.id));
    expect(resposta.body.subgrupos.map((grupo: { orcamentoPontos: string }) => grupo.orcamentoPontos)).toEqual(["70.00", "6.00", "44.00"]);

    const desatualizada = await cenario.apiSecretaria.put(caminho(cenario), { body: edicao(regra) });
    erroSeguro(desatualizada, 409, "VERSAO_OBSOLETA");
    expect((await cenario.apiSecretaria.get(caminho(cenario))).body).toEqual(resposta.body);
  });

  for (const [orcamentoPontos, soma] of [["41.00", "119"], ["43.00", "121"]]) {
    test(`soma ${soma} é rejeitada sem persistir regra parcial de120`, async ({ novoCenario }) => {
      const cenario = await novoCenario();
      const dados = dadosRegraPontuacao("120");
      dados.subgrupos[2].orcamentoPontos = orcamentoPontos;
      const resposta = await cenario.apiSecretaria.put(caminho(cenario), { body: dados });
      erroSeguro(resposta, 400, "SOMA_DIVERGENTE");
      expect(await contar("regra_pontuacao", { curso_id: cenario.cursoId, periodo_letivo_id: cenario.periodoLetivoId })).toBe(0);
      erroSeguro(await cenario.apiSecretaria.get(caminho(cenario)), 404, "REGRA_AUSENTE");
    });
  }

  for (const caso of [
    { nome: "número JSON", valor: 120, codigo: "VALOR_INVALIDO" },
    { nome: "precisão excedente com zero final", valor: "120.000", codigo: "PRECISAO_INVALIDA" },
  ]) {
    test(`rejeita total como ${caso.nome} sem normalização silenciosa`, async ({ novoCenario }) => {
      const cenario = await novoCenario();
      const resposta = await cenario.apiSecretaria.put(caminho(cenario), {
        body: { ...dadosRegraPontuacao("120"), totalPontos: caso.valor },
      });
      erroSeguro(resposta, 400, caso.codigo);
      expect(resposta.body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ campo: "totalPontos", codigo: caso.codigo })]));
      expect(await contar("regra_pontuacao", { curso_id: cenario.cursoId, periodo_letivo_id: cenario.periodoLetivoId })).toBe(0);
    });
  }

  test("pontos de entrada textuais são devolvidos com duas casas", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const dados = dadosRegraPontuacao("120");
    dados.totalPontos = "120";
    dados.subgrupos[0].orcamentoPontos = "72";
    dados.subgrupos[1].orcamentoPontos = "6.0";
    dados.subgrupos[2].orcamentoPontos = "42";
    const resposta = await cenario.apiSecretaria.put(caminho(cenario), { body: dados });
    expect(resposta.status).toBe(201);
    expect(resposta.body.totalPontos).toBe("120.00");
    expect(resposta.body.subgrupos.map((grupo: { orcamentoPontos: string }) => grupo.orcamentoPontos)).toEqual(["72.00", "6.00", "42.00"]);
  });

  test("nomes livres e repetidos conservam identidades diferentes", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const dados = dadosRegraPontuacao("120");
    dados.subgrupos[0].nome = "Produção autoral";
    dados.subgrupos[2].nome = "Produção autoral";
    const resposta = await cenario.apiSecretaria.put(caminho(cenario), { body: dados });
    expect(resposta.status).toBe(201);
    expect(resposta.body.subgrupos[0].nome).toBe("Produção autoral");
    expect(resposta.body.subgrupos[2].nome).toBe("Produção autoral");
    expect(resposta.body.subgrupos[0].id).not.toBe(resposta.body.subgrupos[2].id);
  });

  test("quatro perfis respeitam consulta, escrita e autoria administrativa original", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const regra = await cenario.configurarRegra("120");
    const aluno = await cenario.matricularAluno();
    const emailAdmin = ids.email("admin", ids.runId());
    const senhaAdmin = "Administrador@123";
    const administrador = await cadastrarUsuario(cenario.apiSecretaria, {
      nome: "Administrador sintético", email: emailAdmin, senha: senhaAdmin, tipo_usuario: "administrador",
    });
    const apiAdmin = cenario.apiSecretaria.comToken(await login(cenario.apiSecretaria, emailAdmin, senhaAdmin));

    for (const api of [cenario.apiSecretaria, apiAdmin, cenario.apiProfessor]) {
      expect((await api.get(caminho(cenario))).status).toBe(200);
      expect((await api.get(caminhoPlano(cenario.turmaDisciplinaId))).status).toBe(200);
    }
    erroSeguro(await aluno.apiAluno.get(caminho(cenario)), 403, "PERFIL_PROIBIDO");
    erroSeguro(await aluno.apiAluno.get(caminhoPlano(cenario.turmaDisciplinaId)), 403, "PERFIL_PROIBIDO");
    for (const api of [cenario.apiProfessor, aluno.apiAluno]) {
      erroSeguro(await api.put(caminho(cenario), { body: edicao(regra) }), 403, "PERFIL_PROIBIDO");
    }

    const alterada = await apiAdmin.put(caminho(cenario), { body: edicao(regra) });
    expect(alterada.status).toBe(200);
    expect(alterada.body.atualizadaPorUsuarioId).toBe(administrador.id);
    const auditoria = await db()("piv.regra_pontuacao_auditoria")
      .where({ regra_pontuacao_id: regra.id, acao: "ALTERACAO" }).first("usuario_id", "perfil");
    expect(auditoria).toMatchObject({ usuario_id: administrador.id, perfil: "administrador" });
  });

  test("professor sem atribuição não consulta regra ou plano de outra oferta", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    await cenario.configurarRegra("120");
    const outro = await criarProfessorComLogin(cenario.apiSecretaria, ids.runId(), {
      cursoId: cenario.cursoId, cidadeIbge: cenario.cidade.ibge, uf: cenario.cidade.uf,
    });
    const apiOutro = cenario.apiSecretaria.comToken(outro.token);
    erroSeguro(await apiOutro.get(caminho(cenario)), 403, "ESCOPO_PROIBIDO");
    erroSeguro(await apiOutro.get(caminhoPlano(cenario.turmaDisciplinaId)), 403, "ESCOPO_PROIBIDO");
  });

  test("requisições sem autenticação recebem401", async ({ api, novoCenario }) => {
    const cenario = await novoCenario();
    expect((await api.get(caminho(cenario))).status).toBe(401);
    expect((await api.put(caminho(cenario), { body: dadosRegraPontuacao("120") })).status).toBe(401);
    expect((await api.get(caminhoPlano(cenario.turmaDisciplinaId))).status).toBe(401);
  });

  test("duas ofertas compartilham regra120 e conservam saldos independentes", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const irma = await cenario.criarOfertaIrma(ids.runId());
    const regra = await cenario.configurarRegra("120");
    await inserirAvaliacao(cenario, regra);
    await inserirAvaliacao(cenario, regra);
    await inserirAvaliacao(cenario, regra, irma.turmaDisciplinaId, "12.00");

    const planoA = await cenario.apiProfessor.get(caminhoPlano(cenario.turmaDisciplinaId));
    const planoB = await cenario.apiProfessor.get(caminhoPlano(irma.turmaDisciplinaId));
    expect(planoA.status).toBe(200);
    expect(planoB.status).toBe(200);
    expect(planoA.body.regraPontuacaoId).toBe(regra.id);
    expect(planoB.body.regraPontuacaoId).toBe(regra.id);
    expect(planoA.body.subgrupos[0]).toMatchObject({ id: regra.subgrupos[0].id, pontosDistribuidos: "36.00", saldoPontos: "36.00", quantidadeAtual: 2, quantidadeDisponivel: 2 });
    expect(planoB.body.subgrupos[0]).toMatchObject({ id: regra.subgrupos[0].id, pontosDistribuidos: "12.00", saldoPontos: "60.00", quantidadeAtual: 1, quantidadeDisponivel: 3 });
    expect(planoA.body.subgrupos[2]).toMatchObject({ saldoPontos: "42.00", quantidadeDisponivel: null });
    expect(planoB.body.subgrupos[2]).toMatchObject({ saldoPontos: "42.00", quantidadeDisponivel: null });
  });

  test("primeiro uso preserva a regra mesmo depois de excluir avaliação sem notas", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const regra = await cenario.configurarRegra("120");
    const avaliacaoId = await inserirAvaliacao(cenario, regra);
    const usada = await cenario.apiSecretaria.get(caminho(cenario));
    expect(usada.status).toBe(200);
    expect(usada.body).toMatchObject({ estado: "PRESERVADA", usadaEm: expect.any(String) });
    erroSeguro(await cenario.apiSecretaria.put(caminho(cenario), { body: edicao(regra) }), 409, "REGRA_PRESERVADA");

    expect(await contar("nota", { avaliacao_id: avaliacaoId })).toBe(0);
    expect(await db()("piv.avaliacao").where({ id: avaliacaoId, turma_disciplina_id: cenario.turmaDisciplinaId }).delete()).toBe(1);
    const depois = await cenario.apiSecretaria.get(caminho(cenario));
    expect(depois.body).toEqual(usada.body);
    erroSeguro(await cenario.apiSecretaria.put(caminho(cenario), { body: edicao(regra) }), 409, "REGRA_PRESERVADA");
    const oferta = await db()("piv.turma_disciplina").where({ id: cenario.turmaDisciplinaId }).first("regra_pontuacao_id", "pontuacao_vinculada_em");
    expect(oferta.regra_pontuacao_id).toBe(regra.id);
    expect(oferta.pontuacao_vinculada_em).not.toBeNull();
  });

  test("regra300 só no período seguinte mantém regra, avaliação e saldo anteriores", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const anterior = await cenario.configurarRegra("120");
    const avaliacaoId = await inserirAvaliacao(cenario, anterior);
    const documentoAnterior = await cenario.apiSecretaria.get(caminho(cenario));
    const planoAnterior = await cenario.apiProfessor.get(caminhoPlano(cenario.turmaDisciplinaId));
    const tentativaAtual = { ...dadosRegraPontuacao("300"), versaoEsperada: anterior.versao };
    erroSeguro(await cenario.apiSecretaria.put(caminho(cenario), { body: tentativaAtual }), 409, "REGRA_PRESERVADA");

    const periodoAnterior = await db()("piv.periodo_letivo").where({ id: cenario.periodoLetivoId }).first("ano");
    const periodoSeguinte = await estrutura.criarPeriodoLetivo(cenario.apiSecretaria, ids.runId(), { ano: periodoAnterior.ano, semestre: 2 });
    erroSeguro(await cenario.apiSecretaria.get(caminho(cenario, periodoSeguinte.id)), 404, "REGRA_AUSENTE");
    const turma = await estrutura.criarTurma(cenario.apiSecretaria, ids.runId(), { cursoId: cenario.cursoId, periodoLetivoId: periodoSeguinte.id });
    const oferta = await estrutura.criarTurmaDisciplina(cenario.apiSecretaria, turma.id, { cursoDisciplinaId: cenario.cursoDisciplinaId, professorId: cenario.professor.id });
    const nova = await cenario.apiSecretaria.put(caminho(cenario, periodoSeguinte.id), { body: dadosRegraPontuacao("300") });
    expect(nova.status).toBe(201);
    expect(nova.body).toMatchObject({ cursoId: cenario.cursoId, periodoLetivoId: periodoSeguinte.id, totalPontos: "300.00", usadaEm: null, estado: "DISPONIVEL" });
    expect(nova.body.id).not.toBe(anterior.id);
    const planoNovo = await cenario.apiProfessor.get(caminhoPlano(oferta.id));
    expect(planoNovo.status).toBe(200);
    expect(planoNovo.body).toMatchObject({ regraPontuacaoId: nova.body.id, totalPontos: "300.00" });
    expect(planoNovo.body.subgrupos.map((grupo: { saldoPontos: string }) => grupo.saldoPontos)).toEqual(["180.00", "15.00", "105.00"]);

    expect((await cenario.apiSecretaria.get(caminho(cenario))).body).toEqual(documentoAnterior.body);
    expect((await cenario.apiProfessor.get(caminhoPlano(cenario.turmaDisciplinaId))).body).toEqual(planoAnterior.body);
    const avaliacaoAnterior = await db()("piv.avaliacao").where({ id: avaliacaoId, turma_disciplina_id: cenario.turmaDisciplinaId }).first("valor", "subgrupo_id");
    expect(avaliacaoAnterior).toMatchObject({ valor: "18.00", subgrupo_id: anterior.subgrupos[0].id });
  });
});
