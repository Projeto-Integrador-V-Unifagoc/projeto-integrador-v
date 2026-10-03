import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type { Knex } from "knex";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bearer } from "../../test-helpers/httpAuth";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import {
  criarAvaliacaoPontuacao,
  criarContextoPontuacao,
  criarPontuacaoFixture,
  criarRegraPontuacao,
  type ContextoPontuacao,
  type PontuacaoFixture,
} from "../../test-helpers/pontuacaoFixture";
import { disputarComBloqueioAcademico } from "../../test-helpers/disputaAcademica";

interface SubgrupoHttp {
  id?: string;
  nome: string;
  orcamentoPontos: string;
  modoQuantidade: "FIXA" | "SEM_LIMITE";
  quantidadeFixa: number | null;
  ordem: number;
}

interface CorpoRegra {
  versaoEsperada: number | null;
  totalPontos: string;
  subgrupos: SubgrupoHttp[];
}

interface DocumentoRegra {
  id: string;
  cursoId: string;
  periodoLetivoId: string;
  totalPontos: string;
  origem: string;
  versao: number;
  estado: string;
  usadaEm: string | null;
  criadaEm: string;
  atualizadaEm: string;
  subgrupos: Array<SubgrupoHttp & { id: string }>;
}

interface Ator {
  id: string;
  perfil: "secretaria" | "administrador" | "professor" | "aluno";
}

let pg: PgIntegration;
let app: Express;
let bancoApp: Knex | undefined;
let contexto: ContextoPontuacao;

// Um container exclusivo deste arquivo. O app só resolve a conexão após o setup.
beforeAll(async () => {
  pg = await startPgIntegration();
  ({ app } = await import("../../app"));
  ({ db: bancoApp } = await import("../../database/connection"));
}, 180_000);

beforeEach(async () => {
  contexto = await criarContextoPontuacao(pg.db);
});

afterAll(async () => {
  try {
    await bancoApp?.destroy();
  } finally {
    await pg?.stop();
  }
});

function caminho(c = contexto, cursoId = c.cursoId, periodoId = c.periodoId): string {
  return `/regras-pontuacao/cursos/${cursoId}/periodos/${periodoId}`;
}

function secretaria(c = contexto): Ator {
  return { id: c.usuarioId, perfil: "secretaria" };
}

function composicao(): CorpoRegra {
  return {
    versaoEsperada: null,
    totalPontos: "120.00",
    subgrupos: [
      { nome: "Provas", orcamentoPontos: "72.00", modoQuantidade: "FIXA", quantidadeFixa: 4, ordem: 0 },
      { nome: "Avaliações institucionais", orcamentoPontos: "6.00", modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 1 },
      { nome: "Trabalhos e projetos", orcamentoPontos: "42.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 2 },
    ],
  };
}

function editar(documento: DocumentoRegra): CorpoRegra {
  return {
    versaoEsperada: documento.versao,
    totalPontos: documento.totalPontos,
    subgrupos: documento.subgrupos.map((grupo) => ({ ...grupo })),
  };
}

async function consultar(ator = secretaria(), url = caminho()): Promise<Response> {
  return request(app).get(url).set("Authorization", bearer(ator.perfil, ator.id));
}

async function salvar(corpo: object, ator = secretaria(), url = caminho()): Promise<Response> {
  return request(app).put(url).set("Authorization", bearer(ator.perfil, ator.id)).send(corpo);
}

async function criarViaHttp(ator = secretaria()): Promise<DocumentoRegra> {
  const resposta = await salvar(composicao(), ator);
  expect(resposta.status).toBe(201);
  return resposta.body as DocumentoRegra;
}

async function criarAtor(perfil: Ator["perfil"]): Promise<Ator> {
  const id = randomUUID();
  await pg.db("piv.usuario").insert({
    id, nome: "Usuário sintético", email: `${id}@example.test`,
    senha: "fixture-sem-autenticacao", tipo_usuario: perfil,
  });
  return { id, perfil };
}

async function professorDaOferta(ativo = true): Promise<Ator> {
  const ator = await criarAtor("professor");
  const oferta = await pg.db("piv.turma_disciplina").where({ id: contexto.ofertaId }).first("professor_id");
  await pg.db("piv.professor").where({ id: oferta.professor_id }).update({ usuario_id: ator.id, ativo });
  return ator;
}

async function estadoPersistido(c = contexto) {
  const regra = await pg.db("piv.regra_pontuacao")
    .where({ curso_id: c.cursoId, periodo_letivo_id: c.periodoId }).first();
  const subgrupos = regra
    ? await pg.db("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: regra.id }).orderBy("id")
    : [];
  const auditoria = regra
    ? await pg.db("piv.regra_pontuacao_auditoria").where({ regra_pontuacao_id: regra.id }).orderBy("id")
    : [];
  const ofertas = await pg.db("piv.turma_disciplina")
    .whereIn("id", [c.ofertaId, c.outraOfertaId]).orderBy("id")
    .select("id", "regra_pontuacao_id", "pontuacao_vinculada_em");
  return { regra, subgrupos, auditoria, ofertas };
}

function erroSeguro(resposta: Response, status: number, codigo?: string): void {
  expect(resposta.status).toBe(status);
  expect(resposta.body).toMatchObject({ codigo: expect.any(String), mensagem: expect.any(String) });
  if (codigo) expect(resposta.body.codigo).toBe(codigo);
  expect(resposta.body).not.toHaveProperty("stack");
  expect(resposta.body).not.toHaveProperty("sql");
  expect(JSON.stringify(resposta.body)).not.toMatch(/SQLSTATE|23503|23505|23514|SELECT\s|INSERT\s|UPDATE\s|knex|pg-protocol/i);
}

function erroDeCampo(resposta: Response, codigo: string, campo: string): void {
  erroSeguro(resposta, 400, codigo);
  expect(resposta.body.campos).toEqual(expect.arrayContaining([
    expect.objectContaining({ campo, codigo, mensagem: expect.any(String) }),
  ]));
}

function documentoValido(documento: DocumentoRegra, c = contexto): void {
  expect(documento).toMatchObject({
    id: expect.stringMatching(/^[0-9a-f-]{36}$/i), cursoId: c.cursoId,
    periodoLetivoId: c.periodoId, totalPontos: "120.00", origem: "CONFIGURADA",
    versao: 1, estado: "DISPONIVEL", usadaEm: null,
    criadaEm: expect.any(String), atualizadaEm: expect.any(String),
  });
  expect(Number.isNaN(Date.parse(documento.criadaEm))).toBe(false);
  expect(Number.isNaN(Date.parse(documento.atualizadaEm))).toBe(false);
  expect(documento.subgrupos).toHaveLength(3);
  expect(new Set(documento.subgrupos.map((grupo) => grupo.id)).size).toBe(3);
  documento.subgrupos.forEach((grupo, i) => {
    expect(grupo).toMatchObject({ id: expect.stringMatching(/^[0-9a-f-]{36}$/i), ...composicao().subgrupos[i] });
  });
}

describe("Regra institucional - contrato HTTP e PostgreSQL real T016", () => {
  it("GET sem regra devolve REGRA_AUSENTE, sem criar default ou marcadores", async () => {
    const antes = await estadoPersistido();
    const resposta = await consultar();
    erroSeguro(resposta, 404, "REGRA_AUSENTE");
    expect(resposta.body).not.toHaveProperty("totalPontos", "100.00");
    expect(await estadoPersistido()).toEqual(antes);
    expect(antes.regra).toBeUndefined();
  });

  it("GET lê a regra configurada sem vincular ofertas nem escrever auditoria", async () => {
    await criarRegraPontuacao(pg.db, contexto, {
      subgrupos: composicao().subgrupos.map((g) => ({
        nome: g.nome, orcamento_pontos: g.orcamentoPontos,
        modo_quantidade: g.modoQuantidade, quantidade_fixa: g.quantidadeFixa,
      })),
    });
    const antes = await estadoPersistido();
    const resposta = await consultar();
    expect(resposta.status).toBe(200);
    documentoValido(resposta.body);
    expect(await estadoPersistido()).toEqual(antes);
    expect(antes.ofertas.every((o) => o.regra_pontuacao_id === null && o.pontuacao_vinculada_em === null)).toBe(true);
  });

  it("PUT cria regra e composição com 201, leitura idêntica e auditoria atômica", async () => {
    const documento = await criarViaHttp();
    documentoValido(documento);
    const leitura = await consultar();
    expect(leitura.status).toBe(200);
    expect(leitura.body).toEqual(documento);
    const estado = await estadoPersistido();
    expect(estado.regra).toMatchObject({
      id: documento.id, versao: 1, usada_em: null,
      criada_por_usuario_id: contexto.usuarioId, atualizada_por_usuario_id: contexto.usuarioId,
    });
    expect(estado.subgrupos.map((g) => g.id).sort()).toEqual(documento.subgrupos.map((g) => g.id).sort());
    expect(estado.auditoria).toHaveLength(1);
    expect(estado.auditoria[0]).toMatchObject({ usuario_id: contexto.usuarioId, perfil: "secretaria", acao: "CRIACAO", anterior: null });
    for (const g of documento.subgrupos) expect(JSON.stringify(estado.auditoria[0].novo)).toContain(g.id);
  });

  it("PUT substitui a composição inteira, conserva UUIDs e aceita soma intermediária diferente", async () => {
    const documento = await criarViaHttp();
    const removido = documento.subgrupos[1].id;
    const corpo = editar(documento);
    corpo.totalPontos = "150.00";
    corpo.subgrupos = [
      { ...corpo.subgrupos[2], nome: "Projetos novos", orcamentoPontos: "60.00", ordem: 0 },
      { ...corpo.subgrupos[0], orcamentoPontos: "80.00", quantidadeFixa: 5, ordem: 1 },
      { nome: "Seminários", orcamentoPontos: "10.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 2 },
    ];
    const resposta = await salvar(corpo);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: documento.id, totalPontos: "150.00", versao: 2, usadaEm: null, estado: "DISPONIVEL" });
    expect(resposta.body.subgrupos[0]).toMatchObject(corpo.subgrupos[0]);
    expect(resposta.body.subgrupos[1]).toMatchObject(corpo.subgrupos[1]);
    const novoId = resposta.body.subgrupos[2].id;
    expect(novoId).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/i));
    expect(documento.subgrupos.map((g) => g.id)).not.toContain(novoId);
    const estado = await estadoPersistido();
    expect(estado.subgrupos).toHaveLength(3);
    expect(estado.subgrupos.map((g) => g.id)).not.toContain(removido);
    expect(estado.auditoria).toHaveLength(2);
    const alteracao = estado.auditoria.find((a) => a.acao === "ALTERACAO");
    expect(alteracao).toMatchObject({ usuario_id: contexto.usuarioId, perfil: "secretaria" });
    expect(JSON.stringify(alteracao.anterior)).toContain(removido);
    expect(JSON.stringify(alteracao.novo)).toContain(novoId);
    expect((await consultar()).body).toEqual(resposta.body);
  });

  it("PUT aceita nomes livres e repetidos com identidades distintas", async () => {
    const corpo = composicao();
    corpo.subgrupos[0].nome = "Pesquisa livre";
    corpo.subgrupos[1].nome = "Pesquisa livre";
    corpo.subgrupos[2].nome = "Portfólio e participação";
    const resposta = await salvar(corpo);
    expect(resposta.status).toBe(201);
    expect(resposta.body.subgrupos.map((g: SubgrupoHttp) => g.nome)).toEqual(corpo.subgrupos.map((g) => g.nome));
    expect(resposta.body.subgrupos[0].id).not.toBe(resposta.body.subgrupos[1].id);
  });

  it("PUT conserva centésimos em soma decimal e normaliza as respostas", async () => {
    const corpo = {
      versaoEsperada: null, totalPontos: "100.01",
      subgrupos: [
        { nome: "A", orcamentoPontos: "0.1", modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 0 },
        { nome: "B", orcamentoPontos: "0.2", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 1 },
        { nome: "C", orcamentoPontos: "99.71", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 2 },
      ],
    };
    const resposta = await salvar(corpo);
    expect(resposta.status).toBe(201);
    expect(resposta.body.totalPontos).toBe("100.01");
    expect(resposta.body.subgrupos.map((g: SubgrupoHttp) => g.orcamentoPontos)).toEqual(["0.10", "0.20", "99.71"]);
  });

  it("PUT aceita total acima do limite físico antigo sem perda de precisão", async () => {
    const total = "9007199254740993.01";
    const resposta = await salvar({
      versaoEsperada: null, totalPontos: total,
      subgrupos: [{ nome: "Total livre", orcamentoPontos: total, modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 0 }],
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body.totalPontos).toBe(total);
    expect(resposta.body.subgrupos[0].orcamentoPontos).toBe(total);
    expect((await estadoPersistido()).regra.total_pontos).toBe(total);
  });

  it.each([
    ["número JSON", 120, "VALOR_INVALIDO"], ["sinal positivo", "+120", "VALOR_INVALIDO"],
    ["negativo", "-120", "VALOR_INVALIDO"], ["expoente", "1.2e2", "VALOR_INVALIDO"],
    ["espaço", " 120", "VALOR_INVALIDO"], ["vírgula", "120,00", "VALOR_INVALIDO"],
    ["zero à esquerda", "0120", "VALOR_INVALIDO"], ["três casas", "120.000", "PRECISAO_INVALIDA"],
    ["quebra de linha", "120\n", "VALOR_INVALIDO"], ["zero", "0.00", "VALOR_INVALIDO"],
    ["ausência", null, "VALOR_INVALIDO"],
  ])("PUT rejeita total inválido: %s sem persistir rascunho", async (_nome, valor, codigo) => {
    const antes = await estadoPersistido();
    const resposta = await salvar({ ...composicao(), totalPontos: valor });
    erroDeCampo(resposta, String(codigo), "totalPontos");
    expect(await estadoPersistido()).toEqual(antes);
  });

  it.each([
    ["numérico", 72, "VALOR_INVALIDO"], ["mais de duas casas", "72.000", "PRECISAO_INVALIDA"],
    ["zero", "0", "VALOR_INVALIDO"], ["negativo", "-72", "VALOR_INVALIDO"],
  ])("PUT rejeita orçamento %s e aponta o item", async (_nome, valor, codigo) => {
    const corpo = composicao();
    const resposta = await salvar({ ...corpo, subgrupos: [{ ...corpo.subgrupos[0], orcamentoPontos: valor }, ...corpo.subgrupos.slice(1)] });
    erroDeCampo(resposta, String(codigo), "subgrupos[0].orcamentoPontos");
    expect((await estadoPersistido()).regra).toBeUndefined();
  });

  it("PUT rejeita soma divergente na edição sem mudar regra, grupos, versão ou auditoria", async () => {
    const documento = await criarViaHttp();
    const antes = await estadoPersistido();
    const corpo = editar(documento);
    corpo.subgrupos[0].orcamentoPontos = "72.01";
    const resposta = await salvar(corpo);
    erroSeguro(resposta, 400, "SOMA_DIVERGENTE");
    expect(resposta.body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ codigo: "SOMA_DIVERGENTE" })]));
    expect(await estadoPersistido()).toEqual(antes);
  });

  it.each([
    ["fixa sem quantidade", "FIXA", null], ["fixa zero", "FIXA", 0],
    ["fixa negativa", "FIXA", -1], ["fixa fracionária", "FIXA", 1.5],
    ["fixa textual", "FIXA", "4"], ["sem limite com quantidade", "SEM_LIMITE", 1],
    ["modo desconhecido", "PERCENTUAL", null],
  ])("PUT rejeita quantidade incoerente: %s", async (_nome, modo, quantidade) => {
    const corpo = composicao();
    const resposta = await salvar({ ...corpo, subgrupos: [{ ...corpo.subgrupos[0], modoQuantidade: modo, quantidadeFixa: quantidade }, ...corpo.subgrupos.slice(1)] });
    erroSeguro(resposta, 400, "QUANTIDADE_INVALIDA");
    expect(resposta.body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ codigo: "QUANTIDADE_INVALIDA" })]));
    expect((await estadoPersistido()).regra).toBeUndefined();
  });

  it.each(["", "   "])("PUT rejeita nome vazio após trim: '%s'", async (nome) => {
    const corpo = composicao();
    corpo.subgrupos[0].nome = nome;
    const resposta = await salvar(corpo);
    erroSeguro(resposta, 400, "VALOR_INVALIDO");
    expect((await estadoPersistido()).regra).toBeUndefined();
  });

  it("PUT rejeita composição vazia sem gravar regra", async () => {
    const resposta = await salvar({ ...composicao(), subgrupos: [] });
    erroSeguro(resposta, 400);
    expect((await estadoPersistido()).regra).toBeUndefined();
  });

  it("PUT rejeita grupo de outra regra e conserva os dois conjuntos inteiros", async () => {
    const documento = await criarViaHttp();
    const outro = await criarPontuacaoFixture(pg.db);
    const antes = await estadoPersistido();
    const antesOutro = await estadoPersistido(outro);
    const corpo = editar(documento);
    corpo.subgrupos[0].id = outro.subgrupos[0].id;
    const resposta = await salvar(corpo);
    erroSeguro(resposta, 400);
    expect(await estadoPersistido()).toEqual(antes);
    expect(await estadoPersistido(outro)).toEqual(antesOutro);
    expect(JSON.stringify(resposta.body)).not.toContain(outro.cursoId);
  });

  it("PUT rejeita UUID de grupo inexistente sem inseri-lo como novo", async () => {
    const documento = await criarViaHttp();
    const antes = await estadoPersistido();
    const corpo = editar(documento);
    corpo.subgrupos[0].id = randomUUID();
    erroSeguro(await salvar(corpo), 400);
    expect(await estadoPersistido()).toEqual(antes);
  });

  it("PUT rejeita UUID repetido na composição sem gravação parcial", async () => {
    const documento = await criarViaHttp();
    const antes = await estadoPersistido();
    const corpo = editar(documento);
    corpo.subgrupos[1].id = corpo.subgrupos[0].id;
    erroSeguro(await salvar(corpo), 400);
    expect(await estadoPersistido()).toEqual(antes);
  });

  it("PUT rejeita versão obsoleta e conserva a edição mais recente", async () => {
    const documento = await criarViaHttp();
    const atualizado = editar(documento);
    atualizado.subgrupos[0].nome = "Provas atualizadas";
    const primeiraEdicao = await salvar(atualizado);
    expect(primeiraEdicao.status).toBe(200);
    expect(primeiraEdicao.body.versao).toBe(2);
    const antes = await estadoPersistido();
    const obsoleto = editar(documento);
    obsoleto.subgrupos[2].nome = "Edição obsoleta";
    erroSeguro(await salvar(obsoleto), 409, "VERSAO_OBSOLETA");
    expect(await estadoPersistido()).toEqual(antes);
    expect((await consultar()).body).toEqual(primeiraEdicao.body);
  });

  it("PUT com intenção de criação sobre par existente retorna conflito seguro", async () => {
    await criarViaHttp();
    const antes = await estadoPersistido();
    const resposta = await salvar(composicao());
    erroSeguro(resposta, 409);
    expect(["VERSAO_OBSOLETA", "CONFLITO_CONCORRENCIA"]).toContain(resposta.body.codigo);
    expect(await estadoPersistido()).toEqual(antes);
  });

  it.each([0, -1, 1.5, "1"])("PUT rejeita versão de edição inválida: %s", async (versaoEsperada) => {
    const documento = await criarViaHttp();
    const antes = await estadoPersistido();
    erroSeguro(await salvar({ ...editar(documento), versaoEsperada }), 400);
    expect(await estadoPersistido()).toEqual(antes);
  });

  it("PUT não cria par ausente quando a intenção é atualizar uma versão", async () => {
    erroSeguro(await salvar({ ...composicao(), versaoEsperada: 1 }), 409, "VERSAO_OBSOLETA");
    expect((await estadoPersistido()).regra).toBeUndefined();
  });

  it("configuração de outro período é explícita e não clona a atual", async () => {
    const original = await criarViaHttp();
    const urlOutroPeriodo = caminho(contexto, contexto.cursoId, contexto.outroPeriodoId);
    erroSeguro(await consultar(secretaria(), urlOutroPeriodo), 404, "REGRA_AUSENTE");
    expect(await pg.db("piv.regra_pontuacao").where({ curso_id: contexto.cursoId }).count("* as total").first()).toMatchObject({ total: "1" });
    const resposta = await salvar({ ...composicao(), totalPontos: "300.00", subgrupos: [
      { nome: "Distribuição nova", orcamentoPontos: "300.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 0 },
    ] }, secretaria(), urlOutroPeriodo);
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ periodoLetivoId: contexto.outroPeriodoId, totalPontos: "300.00" });
    expect(resposta.body.id).not.toBe(original.id);
    expect((await consultar()).body).toEqual(original);
  });

  it.each(["get", "put"] as const)("%s exige autenticação", async (metodo) => {
    const resposta = metodo === "get"
      ? await request(app).get(caminho())
      : await request(app).put(caminho()).send(composicao());
    expect(resposta.status).toBe(401);
    expect((await estadoPersistido()).regra).toBeUndefined();
  });

  it.each(["aluno", "professor"] as const)("PUT proíbe perfil %s antes de qualquer escrita", async (perfil) => {
    const ator = perfil === "professor" ? await professorDaOferta() : await criarAtor(perfil);
    erroSeguro(await salvar(composicao(), ator), 403, "PERFIL_PROIBIDO");
    expect((await estadoPersistido()).regra).toBeUndefined();
  });

  it("GET proíbe aluno na consulta institucional mesmo com regra existente", async () => {
    await criarRegraPontuacao(pg.db, contexto);
    const aluno = await criarAtor("aluno");
    await pg.db("piv.aluno").where({ id: contexto.alunoId }).update({ usuario_id: aluno.id });
    const antes = await estadoPersistido();
    erroSeguro(await consultar(aluno), 403, "PERFIL_PROIBIDO");
    expect(await estadoPersistido()).toEqual(antes);
  });

  it("GET permite professor ativo da oferta, sem permitir alterar a regra", async () => {
    const regra = await criarRegraPontuacao(pg.db, contexto);
    const professor = await professorDaOferta();
    const resposta = await consultar(professor);
    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(regra.regraId);
    const antes = await estadoPersistido();
    erroSeguro(await salvar(composicao(), professor), 403, "PERFIL_PROIBIDO");
    expect(await estadoPersistido()).toEqual(antes);
  });

  it("GET rejeita professor inativo mesmo quando sua oferta existe", async () => {
    await criarRegraPontuacao(pg.db, contexto);
    const professor = await professorDaOferta(false);
    erroSeguro(await consultar(professor), 403, "ESCOPO_PROIBIDO");
  });

  it("GET rejeita professor sem atribuição no par", async () => {
    await criarRegraPontuacao(pg.db, contexto);
    erroSeguro(await consultar(await criarAtor("professor")), 403, "ESCOPO_PROIBIDO");
  });

  it("GET não revela regra nem sua ausência fora do par autorizado do professor", async () => {
    const professor = await professorDaOferta();
    const outraRegra = await criarRegraPontuacao(pg.db, { ...contexto, cursoId: contexto.outroCursoId });
    const existente = await consultar(professor, caminho(contexto, contexto.outroCursoId));
    const ausente = await consultar(professor, caminho(contexto, contexto.outroCursoId, contexto.outroPeriodoId));
    erroSeguro(existente, 403, "ESCOPO_PROIBIDO");
    erroSeguro(ausente, 403, "ESCOPO_PROIBIDO");
    expect(JSON.stringify(existente.body)).not.toContain(outraRegra.regraId);
    expect(existente.body).not.toHaveProperty("subgrupos");
    expect(ausente.body).not.toHaveProperty("totalPontos");
  });

  it("administrador cria/edita como gestão e conserva perfil original na autoria", async () => {
    const admin = await criarAtor("administrador");
    const documento = await criarViaHttp(admin);
    const corpo = editar(documento);
    corpo.subgrupos[2].nome = "Projetos pelo administrador";
    const resposta = await salvar(corpo, admin);
    expect(resposta.status).toBe(200);
    expect((await consultar(admin)).body).toEqual(resposta.body);
    const estado = await estadoPersistido();
    expect(estado.regra).toMatchObject({ criada_por_usuario_id: admin.id, atualizada_por_usuario_id: admin.id });
    expect(estado.auditoria.map((a) => a.acao).sort()).toEqual(["ALTERACAO", "CRIACAO"]);
    expect(estado.auditoria.every((a) => a.usuario_id === admin.id && a.perfil === "administrador")).toBe(true);
  });

  it("payload não concede autoria, perfil, origem, versão nem marcadores", async () => {
    const impostor = await criarAtor("administrador");
    const momentoForjado = "2000-01-01T00:00:00.000Z";
    const resposta = await salvar({
      ...composicao(), autor: impostor.id, usuarioId: impostor.id, perfil: "administrador",
      criadaPorUsuarioId: impostor.id, atualizadaPorUsuarioId: impostor.id,
      criada_por_usuario_id: impostor.id, atualizada_por_usuario_id: impostor.id,
      criadaEm: momentoForjado, atualizadaEm: momentoForjado, criado_em: momentoForjado,
      usadaEm: momentoForjado, usada_em: momentoForjado, origem: "HISTORICA", versao: 99,
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ origem: "CONFIGURADA", versao: 1, usadaEm: null, estado: "DISPONIVEL" });
    const estado = await estadoPersistido();
    expect(estado.regra).toMatchObject({ criada_por_usuario_id: contexto.usuarioId, atualizada_por_usuario_id: contexto.usuarioId, usada_em: null });
    expect(estado.auditoria).toHaveLength(1);
    expect(estado.auditoria[0]).toMatchObject({ usuario_id: contexto.usuarioId, perfil: "secretaria", acao: "CRIACAO" });
    expect(new Date(estado.auditoria[0].criado_em).toISOString()).not.toBe(momentoForjado);
  });

  it.each(["curso", "periodo"] as const)("PUT traduz %s inexistente em 404 sem SQL nem gravação parcial", async (alvo) => {
    const url = alvo === "curso" ? caminho(contexto, randomUUID()) : caminho(contexto, contexto.cursoId, randomUUID());
    erroSeguro(await salvar(composicao(), secretaria(), url), 404, "REGISTRO_NAO_ENCONTRADO");
    expect((await estadoPersistido()).regra).toBeUndefined();
    expect(await pg.db("piv.regra_pontuacao_auditoria").where({ usuario_id: contexto.usuarioId })).toEqual([]);
  });

  it.each(["curso", "periodo"] as const)("GET/PUT validam UUID de %s na fronteira HTTP", async (alvo) => {
    const url = alvo === "curso" ? caminho(contexto, "invalido") : caminho(contexto, contexto.cursoId, "invalido");
    erroSeguro(await consultar(secretaria(), url), 400);
    erroSeguro(await salvar(composicao(), secretaria(), url), 400);
    expect((await estadoPersistido()).regra).toBeUndefined();
  });

  it("primeira avaliação preserva a regra e sua exclusão sem nota não libera a edição", async () => {
    const regra = await criarRegraPontuacao(pg.db, contexto);
    const fixture: PontuacaoFixture = { ...contexto, ...regra };
    const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, fixture);
    const preservada = await consultar();
    expect(preservada.status).toBe(200);
    expect(preservada.body).toMatchObject({ id: regra.regraId, estado: "PRESERVADA", usadaEm: expect.any(String) });
    const corpo = editar(preservada.body);
    corpo.subgrupos[0].nome = "Tentativa posterior";
    const antes = await estadoPersistido();
    erroSeguro(await salvar(corpo), 409, "REGRA_PRESERVADA");
    expect(await estadoPersistido()).toEqual(antes);
    await pg.db("piv.avaliacao").where({ id: avaliacaoId }).delete();
    const depoisDaExclusao = await estadoPersistido();
    expect(depoisDaExclusao.regra.usada_em).toEqual(antes.regra.usada_em);
    erroSeguro(await salvar(corpo), 409, "REGRA_PRESERVADA");
    expect(await estadoPersistido()).toEqual(depoisDaExclusao);
    expect((await consultar()).body).toEqual(preservada.body);
  });

  it("dois PUT de criação disputam o mesmo par com espera comprovada, uma regra e um evento", async () => {
    const resultado = await disputarComBloqueioAcademico<Response>(pg.db,
      async (trx) => { await trx("piv.periodo_letivo").where({ id: contexto.periodoId }).forUpdate().first(); },
      [() => salvar(composicao()), () => salvar(composicao())],
    );
    expect(resultado.bloqueios).toHaveLength(2);
    expect(resultado.bloqueios.every((b) => b.cadeiaAteBloqueador.includes(resultado.bloqueadorPid))).toBe(true);
    const respostas = resultado.resultados.map((r) => {
      expect(r.status).toBe("fulfilled");
      if (r.status !== "fulfilled") throw r.reason;
      return r.value;
    });
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
    const vencedor = respostas.find((r) => r.status === 201)!;
    erroSeguro(respostas.find((r) => r.status === 409)!, 409);
    const estado = await estadoPersistido();
    expect(estado.regra).toMatchObject({ id: vencedor.body.id, versao: 1 });
    expect(estado.subgrupos).toHaveLength(3);
    expect(estado.auditoria).toHaveLength(1);
    expect(estado.auditoria[0]).toMatchObject({ acao: "CRIACAO", usuario_id: contexto.usuarioId, perfil: "secretaria" });
    expect((await consultar()).body).toEqual(vencedor.body);
  });

  it("edição versus primeiro uso compartilham o lock e preservam a composição vencedora", async () => {
    const regra = await criarRegraPontuacao(pg.db, contexto);
    const fixture: PontuacaoFixture = { ...contexto, ...regra };
    const leitura = await consultar();
    expect(leitura.status).toBe(200);
    const corpo = editar(leitura.body);
    corpo.subgrupos[0].orcamentoPontos = "70.00";
    corpo.subgrupos[1].orcamentoPontos = "8.00";
    type Operacao = { tipo: "edicao"; resposta: Response } | { tipo: "primeiroUso"; id: string };
    const resultado = await disputarComBloqueioAcademico<Operacao>(pg.db,
      async (trx) => { await trx("piv.regra_pontuacao").where({ id: regra.regraId }).forUpdate().first(); },
      [
        async () => ({ tipo: "edicao", resposta: await salvar(corpo) }),
        async () => ({ tipo: "primeiroUso", id: await pg.db.transaction((trx) => criarAvaliacaoPontuacao(trx, fixture)) }),
      ],
    );
    expect(resultado.bloqueios).toHaveLength(2);
    expect(resultado.bloqueios.every((b) => b.cadeiaAteBloqueador.includes(resultado.bloqueadorPid))).toBe(true);
    const operacoes = resultado.resultados.map((r) => {
      expect(r.status).toBe("fulfilled");
      if (r.status !== "fulfilled") throw r.reason;
      return r.value;
    });
    const edicao = operacoes.find((o) => o.tipo === "edicao");
    const uso = operacoes.find((o) => o.tipo === "primeiroUso");
    if (!edicao || edicao.tipo !== "edicao" || !uso || uso.tipo !== "primeiroUso") throw new Error("Operações incompletas na disputa.");
    expect([200, 409]).toContain(edicao.resposta.status);
    const estado = await estadoPersistido();
    expect(estado.regra.usada_em).not.toBeNull();
    expect(estado.regra.id).toBe(regra.regraId);
    const oferta = estado.ofertas.find((o) => o.id === contexto.ofertaId)!;
    expect(oferta.regra_pontuacao_id).toBe(regra.regraId);
    expect(oferta.pontuacao_vinculada_em).not.toBeNull();
    expect(await pg.db("piv.avaliacao").where({ id: uso.id }).first()).toMatchObject({ turma_disciplina_id: contexto.ofertaId, subgrupo_id: regra.subgrupos[0].id });
    expect(estado.subgrupos.map((g) => g.id).sort()).toEqual(regra.subgrupos.map((g) => g.id).sort());
    const grupos = [...estado.subgrupos].sort((a, b) => a.ordem - b.ordem);
    if (edicao.resposta.status === 200) {
      expect(estado.regra.versao).toBe(2);
      expect(grupos.map((g) => g.orcamento_pontos)).toEqual(["70.00", "8.00", "42.00"]);
      expect(estado.auditoria.filter((a) => a.acao === "ALTERACAO")).toHaveLength(1);
    } else {
      erroSeguro(edicao.resposta, 409, "REGRA_PRESERVADA");
      expect(estado.regra.versao).toBe(1);
      expect(grupos.map((g) => g.orcamento_pontos)).toEqual(["72.00", "6.00", "42.00"]);
      expect(estado.auditoria.filter((a) => a.acao === "ALTERACAO")).toHaveLength(0);
    }
    // O fixture SQL provoca o uso real; não atribui um ator HTTP fictício ao evento.
    const depois = await consultar();
    expect(depois.status).toBe(200);
    expect(depois.body.estado).toBe("PRESERVADA");
    erroSeguro(await salvar(editar(depois.body)), 409, "REGRA_PRESERVADA");
    expect(await estadoPersistido()).toEqual(estado);
  });
});
