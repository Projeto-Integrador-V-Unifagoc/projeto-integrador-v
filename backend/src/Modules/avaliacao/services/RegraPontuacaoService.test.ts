import { describe, expect, it } from "vitest";
import { validarComposicaoRegra, validarVersaoRegra } from "./RegraPontuacaoService";
import { calcularPlanoAvaliacao } from "./PlanoAvaliacaoService";

const REGRA_ID = "11111111-1111-4111-8111-111111111111";
const CURSO_ID = "22222222-2222-4222-8222-222222222222";
const PERIODO_ID = "33333333-3333-4333-8333-333333333333";
const OFERTA_A = "44444444-4444-4444-8444-444444444444";
const OFERTA_B = "55555555-5555-4555-8555-555555555555";
const USUARIO_ID = "66666666-6666-4666-8666-666666666666";
const SUBGRUPOS = [
  "77777777-7777-4777-8777-777777777777",
  "88888888-8888-4888-8888-888888888888",
  "99999999-9999-4999-8999-999999999999",
];

interface SubgrupoEntrada {
  id?: string;
  nome: string;
  orcamentoPontos: string;
  modoQuantidade: "FIXA" | "SEM_LIMITE";
  quantidadeFixa: number | null;
  ordem: number;
}

function composicao(): {
  versaoEsperada: number | null;
  totalPontos: string;
  subgrupos: SubgrupoEntrada[];
} {
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

function regra() {
  const dados = composicao();
  return {
    id: REGRA_ID,
    cursoId: CURSO_ID,
    periodoLetivoId: PERIODO_ID,
    totalPontos: dados.totalPontos,
    origem: "CONFIGURADA" as const,
    versao: 1,
    estado: "DISPONIVEL" as "DISPONIVEL" | "PRESERVADA",
    usadaEm: null as string | null,
    criadaEm: "2026-09-28T12:00:00.000Z",
    atualizadaEm: "2026-09-28T12:00:00.000Z",
    criadaPorUsuarioId: USUARIO_ID,
    atualizadaPorUsuarioId: USUARIO_ID,
    subgrupos: dados.subgrupos.map((subgrupo, indice) => ({ ...subgrupo, id: SUBGRUPOS[indice] })),
  };
}

function esperarErro(operacao: () => unknown, status: number, codigo?: string) {
  let erro: unknown;
  try {
    operacao();
  } catch (capturado) {
    erro = capturado;
  }
  expect(erro).toBeInstanceOf(Error);
  expect(erro).toMatchObject(codigo ? { status, codigo } : { status });
}

function avaliacao(id: string, subgrupo_id: string | null, valor: string, tipo_avaliacao = "REGULAR") {
  return { id, subgrupo_id, tipo_avaliacao, valor };
}

function planoCompleto120() {
  return [
    ...[1, 2, 3, 4].map((numero) => avaliacao(`prova-${numero}`, SUBGRUPOS[0], "18.00")),
    avaliacao("institucional", SUBGRUPOS[1], "6.00"),
    avaliacao("trabalho", SUBGRUPOS[2], "20.00"),
    avaliacao("projeto", SUBGRUPOS[2], "22.00"),
  ];
}

describe("composição da regra institucional", () => {
  it("aceita a regra de 120 pontos com 72/fixa4, 6/fixa1 e 42/sem limite", () => {
    const dados = composicao();
    expect(validarComposicaoRegra(dados)).toEqual(dados);
  });

  it("aceita nomes livres e um único subgrupo sem catálogo ou divisão obrigatória", () => {
    const dados = composicao();
    dados.subgrupos = [{ nome: "Produção autoral integrada", orcamentoPontos: "120.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 0 }];
    expect(validarComposicaoRegra(dados)).toEqual(dados);
  });

  it("aceita nomes repetidos com identidades UUID diferentes", () => {
    const dados = composicao();
    dados.subgrupos[0].id = SUBGRUPOS[0];
    dados.subgrupos[2].id = SUBGRUPOS[2];
    dados.subgrupos[2].nome = dados.subgrupos[0].nome;
    expect(validarComposicaoRegra(dados)).toEqual(dados);
  });

  it("preserva UUIDs dos itens conservados e permite novos itens sem id", () => {
    const dados = composicao();
    dados.versaoEsperada = 1;
    dados.subgrupos[0].id = SUBGRUPOS[0];
    const validada = validarComposicaoRegra(dados);
    expect(validada.subgrupos[0].id).toBe(SUBGRUPOS[0]);
    expect(validada.subgrupos[1].id).toBeUndefined();
  });

  it("rejeita UUID de subgrupo repetido na mesma composição", () => {
    const dados = composicao();
    dados.subgrupos[0].id = SUBGRUPOS[0];
    dados.subgrupos[1].id = SUBGRUPOS[0];
    esperarErro(() => validarComposicaoRegra(dados), 400);
  });

  it.each(["41.00", "43.00"])("rejeita orçamento %s que faz a soma 119/121 divergir do total 120", (orcamentoPontos) => {
    const dados = composicao();
    dados.subgrupos[2].orcamentoPontos = orcamentoPontos;
    esperarErro(() => validarComposicaoRegra(dados), 400, "SOMA_DIVERGENTE");
  });

  it("soma 0.10 e 0.20 exatamente, sem arredondar a composição", () => {
    const dados = {
      versaoEsperada: null,
      totalPontos: "0.30",
      subgrupos: [
        { nome: "A", orcamentoPontos: "0.10", modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 0 },
        { nome: "B", orcamentoPontos: "0.20", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 1 },
      ],
    };
    expect(validarComposicaoRegra(dados)).toEqual(dados);
  });

  it("aceita total e orçamento superiores à precisão de Number", () => {
    const dados = composicao();
    dados.totalPontos = "9007199254740993.01";
    dados.subgrupos = [{ nome: "Total exato", orcamentoPontos: dados.totalPontos, modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 0 }];
    expect(validarComposicaoRegra(dados)).toEqual(dados);
  });

  const pontosInvalidos = [
    { valor: "0.00", codigo: "VALOR_INVALIDO" },
    { valor: "-1.00", codigo: "VALOR_INVALIDO" },
    { valor: 120, codigo: "VALOR_INVALIDO" },
    { valor: null, codigo: "VALOR_INVALIDO" },
    { valor: "1.000", codigo: "PRECISAO_INVALIDA" },
  ];

  it.each(pontosInvalidos)("rejeita total inválido $valor com $codigo", ({ valor, codigo }) => {
    esperarErro(() => validarComposicaoRegra({ ...composicao(), totalPontos: valor }), 400, codigo);
  });

  it.each(pontosInvalidos)("rejeita orçamento inválido $valor com $codigo", ({ valor, codigo }) => {
    const dados = composicao();
    const subgrupos = [{ ...dados.subgrupos[0], orcamentoPontos: valor }, ...dados.subgrupos.slice(1)];
    esperarErro(() => validarComposicaoRegra({ ...dados, subgrupos }), 400, codigo);
  });

  it.each([0, -1, 1.5, "4", null, NaN, Infinity])("rejeita quantidade fixa inválida %s", (quantidadeFixa) => {
    const dados = composicao();
    const subgrupos = [{ ...dados.subgrupos[0], quantidadeFixa }, ...dados.subgrupos.slice(1)];
    esperarErro(() => validarComposicaoRegra({ ...dados, subgrupos }), 400, "QUANTIDADE_INVALIDA");
  });

  it.each([0, 1, "", "4"])("rejeita quantidade %s no modo SEM_LIMITE que exige null", (quantidadeFixa) => {
    const dados = composicao();
    const subgrupos = [...dados.subgrupos.slice(0, 2), { ...dados.subgrupos[2], quantidadeFixa }];
    esperarErro(() => validarComposicaoRegra({ ...dados, subgrupos }), 400, "QUANTIDADE_INVALIDA");
  });

  it.each(["LIVRE", "fixa", null])("rejeita modo de quantidade inválido %s", (modoQuantidade) => {
    const dados = composicao();
    const subgrupos = [{ ...dados.subgrupos[0], modoQuantidade }, ...dados.subgrupos.slice(1)];
    esperarErro(() => validarComposicaoRegra({ ...dados, subgrupos }), 400, "QUANTIDADE_INVALIDA");
  });

  it.each(["", "   ", null, 123])("rejeita nome vazio ou de tipo inválido %s", (nome) => {
    const dados = composicao();
    const subgrupos = [{ ...dados.subgrupos[0], nome }, ...dados.subgrupos.slice(1)];
    esperarErro(() => validarComposicaoRegra({ ...dados, subgrupos }), 400);
  });

  it.each([
    { nome: "null", dados: null },
    { nome: "array", dados: [] },
    { nome: "objeto vazio", dados: {} },
    { nome: "lista vazia de subgrupos", dados: { ...composicao(), subgrupos: [] } },
    { nome: "subgrupos de tipo incorreto", dados: { ...composicao(), subgrupos: {} } },
  ])(
    "rejeita corpo incompleto ou sem composição integral: $nome",
    ({ dados }) => esperarErro(() => validarComposicaoRegra(dados), 400),
  );

  it.each(["id-invalido", null])("rejeita id de subgrupo inválido %s", (id) => {
    const dados = composicao();
    const subgrupos = [{ ...dados.subgrupos[0], id }, ...dados.subgrupos.slice(1)];
    esperarErro(() => validarComposicaoRegra({ ...dados, subgrupos }), 400, "UUID_INVALIDO");
  });

  it.each([0, -1, 1.5, "1", undefined])("rejeita versão de entrada inválida %s sem coagir", (versaoEsperada) => {
    esperarErro(() => validarComposicaoRegra({ ...composicao(), versaoEsperada }), 400);
  });

  it.each([-1, 0.5])("rejeita ordem de apresentação inválida %s", (ordem) => {
    const dados = composicao();
    const subgrupos = [{ ...dados.subgrupos[0], ordem }, ...dados.subgrupos.slice(1)];
    esperarErro(() => validarComposicaoRegra({ ...dados, subgrupos }), 400);
  });
});

describe("versão e preservação desde o primeiro uso", () => {
  it("permite criação somente com ausência de regra e versão null", () => {
    expect(() => validarVersaoRegra(null, null)).not.toThrow();
  });

  it("rejeita edição de uma regra que não existe", () => {
    esperarErro(() => validarVersaoRegra(null, 1), 409, "VERSAO_OBSOLETA");
  });

  it("rejeita criação concorrente quando a regra já existe", () => {
    esperarErro(() => validarVersaoRegra(regra(), null), 409, "VERSAO_OBSOLETA");
  });

  it("permite alteração válida na versão corrente antes do uso", () => {
    expect(() => validarVersaoRegra({ ...regra(), versao: 3 }, 3)).not.toThrow();
  });

  it.each([2, 4])("rejeita versão esperada %s diferente da corrente 3", (versaoEsperada) => {
    esperarErro(() => validarVersaoRegra({ ...regra(), versao: 3 }, versaoEsperada), 409, "VERSAO_OBSOLETA");
  });

  it("rejeita alteração após primeiro uso mesmo com versão corrente", () => {
    const usada = { ...regra(), estado: "PRESERVADA" as const, usadaEm: "2026-09-28T13:00:00.000Z" };
    esperarErro(() => validarVersaoRegra(usada, 1), 409, "REGRA_PRESERVADA");
  });

  it("o marcador de uso continua bloqueante mesmo com estado derivado desatualizado", () => {
    const usada = { ...regra(), usadaEm: "2026-09-28T13:00:00.000Z" };
    esperarErro(() => validarVersaoRegra(usada, 1), 409, "REGRA_PRESERVADA");
  });
});

describe("plano de avaliações por oferta", () => {
  it("representa ausência de regra sem presumir total 100", () => {
    expect(calcularPlanoAvaliacao(OFERTA_A, null, [])).toEqual({
      turmaDisciplinaId: OFERTA_A,
      regraPontuacaoId: null,
      totalPontos: null,
      planoCompleto: false,
      podeCriarRegular: false,
      motivosBloqueio: ["REGRA_AUSENTE"],
      subgrupos: [],
    });
  });

  it("sem regra, avaliações recebidas não inventam configuração histórica 100", () => {
    const plano = calcularPlanoAvaliacao(OFERTA_A, null, [avaliacao("legada", null, "100.00", "PROVA")]);
    expect(plano.regraPontuacaoId).toBeNull();
    expect(plano.totalPontos).toBeNull();
    expect(plano.podeCriarRegular).toBe(false);
    expect(plano.motivosBloqueio).toContain("REGRA_AUSENTE");
  });

  it("disponibiliza orçamento e quantidade integrais quando não há avaliações", () => {
    const plano = calcularPlanoAvaliacao(OFERTA_A, regra(), []);
    expect(plano).toMatchObject({ turmaDisciplinaId: OFERTA_A, regraPontuacaoId: REGRA_ID, totalPontos: "120.00", planoCompleto: false, podeCriarRegular: true, motivosBloqueio: [] });
    expect(plano.subgrupos).toEqual([
      { id: SUBGRUPOS[0], nome: "Provas", orcamentoPontos: "72.00", pontosDistribuidos: "0.00", saldoPontos: "72.00", modoQuantidade: "FIXA", quantidadeFixa: 4, quantidadeAtual: 0, quantidadeDisponivel: 4, completo: false },
      { id: SUBGRUPOS[1], nome: "Avaliações institucionais", orcamentoPontos: "6.00", pontosDistribuidos: "0.00", saldoPontos: "6.00", modoQuantidade: "FIXA", quantidadeFixa: 1, quantidadeAtual: 0, quantidadeDisponivel: 1, completo: false },
      { id: SUBGRUPOS[2], nome: "Trabalhos e projetos", orcamentoPontos: "42.00", pontosDistribuidos: "0.00", saldoPontos: "42.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, quantidadeAtual: 0, quantidadeDisponivel: null, completo: false },
    ]);
  });

  it("calcula 30 distribuídos, saldo 42 e duas vagas restantes no subgrupo 72/fixa4", () => {
    const plano = calcularPlanoAvaliacao(OFERTA_A, regra(), [avaliacao("p1", SUBGRUPOS[0], "15.00"), avaliacao("p2", SUBGRUPOS[0], "15.00")]);
    expect(plano.subgrupos[0]).toMatchObject({ pontosDistribuidos: "30.00", saldoPontos: "42.00", quantidadeAtual: 2, quantidadeDisponivel: 2, completo: false });
    expect(plano.planoCompleto).toBe(false);
  });

  it("mantém saldos independentes de duas ofertas que compartilham a mesma regra", () => {
    const compartilhada = regra();
    const antes = structuredClone(compartilhada);
    const planoA = calcularPlanoAvaliacao(OFERTA_A, compartilhada, [avaliacao("p1", SUBGRUPOS[0], "18.00")]);
    const planoB = calcularPlanoAvaliacao(OFERTA_B, compartilhada, []);
    expect(planoA.subgrupos[0].saldoPontos).toBe("54.00");
    expect(planoB.subgrupos[0].saldoPontos).toBe("72.00");
    expect(planoB.subgrupos[0].quantidadeDisponivel).toBe(4);
    expect(planoA.regraPontuacaoId).toBe(planoB.regraPontuacaoId);
    expect(compartilhada).toEqual(antes);
  });

  it("completa o plano somente com todos os orçamentos e quantidades exatos", () => {
    const plano = calcularPlanoAvaliacao(OFERTA_A, regra(), planoCompleto120());
    expect(plano.planoCompleto).toBe(true);
    expect(plano.podeCriarRegular).toBe(false);
    expect(plano.subgrupos.map(({ saldoPontos, quantidadeDisponivel, completo }) => ({ saldoPontos, quantidadeDisponivel, completo }))).toEqual([
      { saldoPontos: "0.00", quantidadeDisponivel: 0, completo: true },
      { saldoPontos: "0.00", quantidadeDisponivel: 0, completo: true },
      { saldoPontos: "0.00", quantidadeDisponivel: null, completo: true },
    ]);
  });

  it("orçamento integral com quantidade fixa incompleta mantém o plano incompleto", () => {
    const avaliacoes = [avaliacao("p1", SUBGRUPOS[0], "36.00"), avaliacao("p2", SUBGRUPOS[0], "36.00"), ...planoCompleto120().slice(4)];
    const plano = calcularPlanoAvaliacao(OFERTA_A, regra(), avaliacoes);
    expect(plano.subgrupos[0]).toMatchObject({ saldoPontos: "0.00", quantidadeAtual: 2, quantidadeDisponivel: 2, completo: false });
    expect(plano.planoCompleto).toBe(false);
  });

  it("quantidade fixa cumprida com orçamento residual mantém o plano incompleto", () => {
    const avaliacoes = [...[1, 2, 3, 4].map((numero) => avaliacao(`p${numero}`, SUBGRUPOS[0], "10.00")), ...planoCompleto120().slice(4)];
    const plano = calcularPlanoAvaliacao(OFERTA_A, regra(), avaliacoes);
    expect(plano.subgrupos[0]).toMatchObject({ pontosDistribuidos: "40.00", saldoPontos: "32.00", quantidadeDisponivel: 0, completo: false });
    expect(plano.planoCompleto).toBe(false);
  });

  it("SEM_LIMITE conserva orçamento e quantidade disponível null mesmo com 100 avaliações", () => {
    const trabalhos = Array.from({ length: 100 }, (_, indice) => avaliacao(`t${indice}`, SUBGRUPOS[2], "0.42"));
    const plano = calcularPlanoAvaliacao(OFERTA_A, regra(), trabalhos);
    expect(plano.subgrupos[2]).toMatchObject({ pontosDistribuidos: "42.00", saldoPontos: "0.00", quantidadeFixa: null, quantidadeAtual: 100, quantidadeDisponivel: null, completo: true });
  });

  it("recuperação não altera pontos, quantidade ou completude do plano regular", () => {
    const avaliacoes = [avaliacao("p1", SUBGRUPOS[0], "18.00")];
    const semRecuperacao = calcularPlanoAvaliacao(OFERTA_A, regra(), avaliacoes);
    const comRecuperacao = calcularPlanoAvaliacao(OFERTA_A, regra(), [...avaliacoes, avaliacao("r1", null, "120.00", "RECUPERACAO")]);
    expect(comRecuperacao).toEqual(semRecuperacao);
  });

  it("tipos históricos continuam regulares sem catálogo de nomes ou máximo fixo", () => {
    const avaliacoes = [avaliacao("p1", SUBGRUPOS[0], "18.00", "PROVA"), avaliacao("tpi", SUBGRUPOS[1], "6.00", "TPI"), avaliacao("t1", SUBGRUPOS[2], "21.00", "TRABALHO")];
    const plano = calcularPlanoAvaliacao(OFERTA_A, regra(), avaliacoes);
    expect(plano.subgrupos.map(({ pontosDistribuidos }) => pontosDistribuidos)).toEqual(["18.00", "6.00", "21.00"]);
  });

  it("identifica saldos por UUID mesmo quando dois subgrupos têm o mesmo nome", () => {
    const repetida = regra();
    repetida.subgrupos[2].nome = repetida.subgrupos[0].nome;
    const plano = calcularPlanoAvaliacao(OFERTA_A, repetida, [avaliacao("p1", SUBGRUPOS[0], "18.00")]);
    expect(plano.subgrupos[0]).toMatchObject({ id: SUBGRUPOS[0], pontosDistribuidos: "18.00", saldoPontos: "54.00" });
    expect(plano.subgrupos[2]).toMatchObject({ id: SUBGRUPOS[2], pontosDistribuidos: "0.00", saldoPontos: "42.00" });
  });

  it("preservar a regra institucional mantém disponível o orçamento restante da oferta", () => {
    const preservada = { ...regra(), estado: "PRESERVADA" as const, usadaEm: "2026-09-28T13:00:00.000Z" };
    const plano = calcularPlanoAvaliacao(OFERTA_A, preservada, [avaliacao("p1", SUBGRUPOS[0], "18.00")]);
    expect(plano.podeCriarRegular).toBe(true);
    expect(plano.subgrupos[0].saldoPontos).toBe("54.00");
  });

  it("distribui 0.10 e 0.20 exatamente em orçamento 0.30", () => {
    const decimal = regra();
    decimal.totalPontos = "0.30";
    decimal.subgrupos = [{ ...decimal.subgrupos[2], orcamentoPontos: "0.30", ordem: 0 }];
    const plano = calcularPlanoAvaliacao(OFERTA_A, decimal, [avaliacao("a", SUBGRUPOS[2], "0.10"), avaliacao("b", SUBGRUPOS[2], "0.20")]);
    expect(plano.subgrupos[0]).toMatchObject({ pontosDistribuidos: "0.30", saldoPontos: "0.00", completo: true });
    expect(plano.planoCompleto).toBe(true);
  });

  it("serializa o plano em strings de pontos sem bigint no JSON", () => {
    const plano = calcularPlanoAvaliacao(OFERTA_A, regra(), planoCompleto120());
    expect(() => JSON.stringify(plano)).not.toThrow();
    expect(JSON.parse(JSON.stringify(plano))).toMatchObject({ totalPontos: "120.00", subgrupos: [{ pontosDistribuidos: "72.00", saldoPontos: "0.00" }, { pontosDistribuidos: "6.00", saldoPontos: "0.00" }, { pontosDistribuidos: "42.00", saldoPontos: "0.00" }] });
  });
});
