import { describe, expect, it } from "vitest";
import { calcularResultadoAcademico, type EntradaResultadoAcademico, type FrequenciaResultadoAcademico } from "./ResultadoAcademico";

const OFERTA = "11111111-1111-1111-1111-111111111111";
const MATRICULA = "22222222-2222-2222-2222-222222222222";
const REGRA = "33333333-3333-3333-3333-333333333333";
const REGULAR = "44444444-4444-4444-4444-444444444444";
const RECUPERACAO = "55555555-5555-5555-5555-555555555555";
const SEGUNDA = "66666666-6666-6666-6666-666666666666";
const FREQUENCIA: FrequenciaResultadoAcademico = { presencas: 9, faltas: 1, percentual: 90, situacao: "REGULAR", requisito: "SUFICIENTE" };

function entrada(total = "120.00", regular: string | null = "72.00", recuperacao?: string | null): EntradaResultadoAcademico {
  const notasPorAvaliacao = new Map<string, string>();
  if (regular !== null) notasPorAvaliacao.set(REGULAR, regular);
  const avaliacoes: EntradaResultadoAcademico["avaliacoes"] = [{ id: REGULAR, tipo: "REGULAR", valor: total }];
  if (recuperacao !== undefined) {
    avaliacoes.push({ id: RECUPERACAO, tipo: "RECUPERACAO", valor: total });
    if (recuperacao !== null) notasPorAvaliacao.set(RECUPERACAO, recuperacao);
  }
  return {
    turmaDisciplinaId: OFERTA, matriculaTurmaDisciplinaId: MATRICULA, avaliacoes, notasPorAvaliacao,
    frequencia: { ...FREQUENCIA },
    plano: { turmaDisciplinaId: OFERTA, regraPontuacaoId: REGRA, totalPontos: total,
      planoCompleto: true, podeCriarRegular: false, motivosBloqueio: [], subgrupos: [{
        id: "77777777-7777-7777-7777-777777777777", nome: "Composição sintética", orcamentoPontos: total,
        modoQuantidade: "FIXA", quantidadeFixa: 1, pontosDistribuidos: total, saldoPontos: "0.00",
        quantidadeAtual: 1, quantidadeDisponivel: 0, completo: true,
      }] },
  };
}

describe("corte exato e transporte do resultado acadêmico versão2", () => {
  it.each([
    ["100.00", "59.99", "60.00", "EM_RECUPERACAO", true],
    ["100.00", "60.00", "60.00", "SUFICIENTE", false],
    ["120.00", "71.99", "72.00", "EM_RECUPERACAO", true],
    ["120.00", "72.00", "72.00", "SUFICIENTE", false],
    ["300.00", "179.99", "180.00", "EM_RECUPERACAO", true],
    ["300.00", "180.00", "180.00", "SUFICIENTE", false],
    ["100.01", "60.00", "60.006", "EM_RECUPERACAO", true],
    ["100.01", "60.01", "60.006", "SUFICIENTE", false],
    ["0.01", "0.00", "0.006", "EM_RECUPERACAO", true],
    ["0.01", "0.01", "0.006", "SUFICIENTE", false],
    ["9007199254740993.01", "5404319552844595.80", "5404319552844595.806", "EM_RECUPERACAO", true],
    ["9007199254740993.01", "5404319552844595.81", "5404319552844595.806", "SUFICIENTE", false],
  ] as const)("total%s/regular%s decide sem arredondar corte%s", (total, regular, corte, estado, elegivel) => {
    const resultado = calcularResultadoAcademico(entrada(total, regular));
    expect(resultado).toMatchObject({ contratoVersao: 2, turmaDisciplinaId: OFERTA, matriculaTurmaDisciplinaId: MATRICULA,
      regraPontuacaoId: REGRA, totalPontos: total, cortePontos: corte, pontosRegularesObtidos: regular,
      pontosEfetivos: regular, etapaRegularCompleta: true, resultadoPorNota: estado, elegivelRecuperacaoPorNota: elegivel,
      aprovacaoDisciplina: estado === "SUFICIENTE" ? "APROVADA" : "PENDENTE" });
  });

  it("179,99/300 exibe60,00% e continua abaixo de180 pontos", () => {
    const r = calcularResultadoAcademico(entrada("300.00", "179.99"));
    expect(r.percentualResultado).toBe(60);
    expect(r.indicadorRegular).toEqual({ percentual: 60, parcial: false, denominadorPontos: "300.00" });
    expect(r.resultadoPorNota).toBe("EM_RECUPERACAO");
    expect(r.motivos).toEqual(expect.arrayContaining(["ABAIXO_DO_CORTE", "RECUPERACAO_PENDENTE"]));
  });

  it("normaliza pontos em duas casas e serializa JSON sem bigint", () => {
    const r = calcularResultadoAcademico(entrada("120", "72", "90.0"));
    expect(r).toMatchObject({ totalPontos: "120.00", cortePontos: "72.00", pontosRegularesObtidos: "72.00",
      pontosMaximosLancados: "120.00", pontosRecuperacao: "90.00", valorMaximoRecuperacao: "120.00", pontosEfetivos: "90.00", percentualResultado: 75 });
    expect(() => JSON.stringify(r)).not.toThrow();
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    expect(r).not.toHaveProperty("mediaFinal");
    expect(r).not.toHaveProperty("situacao");
  });

  it("soma centésimos exatamente antes da decisão", () => {
    const e = entrada("0.30", "0.10");
    e.avaliacoes[0].valor = "0.10";
    e.avaliacoes.push({ id: SEGUNDA, tipo: "REGULAR", valor: "0.20" });
    Object.assign(e.plano.subgrupos[0], { quantidadeFixa: 2, quantidadeAtual: 2 });
    e.notasPorAvaliacao.set(SEGUNDA, "0.20");
    const r = calcularResultadoAcademico(e);
    expect(r).toMatchObject({ pontosRegularesObtidos: "0.30", pontosMaximosLancados: "0.30", cortePontos: "0.18", pontosEfetivos: "0.30", percentualResultado: 100, resultadoPorNota: "SUFICIENTE" });
  });
});

describe("completude, denominador parcial, ausência e zero", () => {
  it("orçamento incompleto com100% parcial não concede recuperação ou aprovação", () => {
    const e = entrada("120.00", "48.00");
    e.avaliacoes[0].valor = "48.00";
    e.plano.planoCompleto = false;
    Object.assign(e.plano.subgrupos[0], { pontosDistribuidos: "48.00", saldoPontos: "72.00", completo: false });
    const r = calcularResultadoAcademico(e);
    expect(r).toMatchObject({ planoCompleto: false, etapaRegularCompleta: false, avaliacoesRegulares: 1, avaliacoesLancadas: 1,
      pontosRegularesObtidos: "48.00", pontosMaximosLancados: "48.00", pontosEfetivos: null, percentualResultado: null,
      resultadoPorNota: "EM_ANDAMENTO", elegivelRecuperacaoPorNota: false, aprovacaoDisciplina: "PENDENTE" });
    expect(r.indicadorRegular).toEqual({ percentual: 100, parcial: true, denominadorPontos: "48.00" });
    expect(r.motivos).toContain("PLANO_INCOMPLETO");
  });

  it("quantidade fixa incompleta continua pendente mesmo com orçamento e notas integrais", () => {
    const e = entrada("120.00", "120.00");
    e.plano.planoCompleto = false;
    Object.assign(e.plano.subgrupos[0], { quantidadeFixa: 2, quantidadeDisponivel: 1, completo: false });
    const r = calcularResultadoAcademico(e);
    expect(r).toMatchObject({ etapaRegularCompleta: false, pontosEfetivos: null, percentualResultado: null, aprovacaoDisciplina: "PENDENTE" });
    expect(r.indicadorRegular).toEqual({ percentual: 100, parcial: true, denominadorPontos: "120.00" });
    expect(r.motivos).toContain("PLANO_INCOMPLETO");
  });

  it("uma nota ausente usa só o máximo lançado e conserva a pendência pelo UUID", () => {
    const e = entrada("120.00", "48.00");
    e.avaliacoes[0].valor = "48.00";
    e.avaliacoes.push({ id: SEGUNDA, tipo: "REGULAR", valor: "72.00" });
    const r = calcularResultadoAcademico(e);
    expect(r).toMatchObject({ planoCompleto: true, etapaRegularCompleta: false, avaliacoesRegulares: 2, avaliacoesLancadas: 1,
      avaliacoesSemNota: [SEGUNDA], pontosMaximosLancados: "48.00", pontosEfetivos: null, percentualResultado: null, resultadoPorNota: "EM_ANDAMENTO", aprovacaoDisciplina: "PENDENTE" });
    expect(r.indicadorRegular).toEqual({ percentual: 100, parcial: true, denominadorPontos: "48.00" });
    expect(r.motivos).toContain("NOTAS_PENDENTES");
  });

  it("zero lançado remove pendência e completa a etapa; ausência permanece null no indicador", () => {
    const ausente = calcularResultadoAcademico(entrada("120.00", null));
    const zero = calcularResultadoAcademico(entrada("120.00", "0.00"));
    expect(ausente).toMatchObject({ avaliacoesLancadas: 0, avaliacoesSemNota: [REGULAR], etapaRegularCompleta: false,
      pontosRegularesObtidos: "0.00", pontosMaximosLancados: "0.00", pontosEfetivos: null, percentualResultado: null, resultadoPorNota: "NAO_LANCADA", elegivelRecuperacaoPorNota: false });
    expect(ausente.indicadorRegular).toEqual({ percentual: null, parcial: true, denominadorPontos: "0.00" });
    expect(ausente.motivos).toEqual(expect.arrayContaining(["SEM_NOTAS", "NOTAS_PENDENTES"]));
    expect(zero).toMatchObject({ avaliacoesLancadas: 1, avaliacoesSemNota: [], etapaRegularCompleta: true,
      pontosEfetivos: "0.00", percentualResultado: 0, resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true });
    expect(zero.indicadorRegular).toEqual({ percentual: 0, parcial: false, denominadorPontos: "120.00" });
    expect(zero.motivos).not.toContain("SEM_NOTAS");
    expect(zero.motivos).not.toContain("NOTAS_PENDENTES");
  });

  it("recuperação registrada não preenche notas regulares ausentes", () => {
    const r = calcularResultadoAcademico(entrada("120.00", null, "90.00"));
    expect(r).toMatchObject({ pontosRecuperacao: "90.00", valorMaximoRecuperacao: "120.00", avaliacoesLancadas: 0,
      avaliacoesSemNota: [REGULAR], etapaRegularCompleta: false, pontosEfetivos: null, percentualResultado: null,
      resultadoPorNota: "NAO_LANCADA", elegivelRecuperacaoPorNota: false, aprovacaoDisciplina: "PENDENTE" });
  });

  it("SEM_LIMITE ainda exige orçamento completo recebido do plano", () => {
    const e = entrada("120.00", "42.00");
    e.avaliacoes[0].valor = "42.00"; e.plano.planoCompleto = false;
    Object.assign(e.plano.subgrupos[0], { modoQuantidade: "SEM_LIMITE", quantidadeFixa: null,
      quantidadeDisponivel: null, pontosDistribuidos: "42.00", saldoPontos: "78.00", completo: false });
    expect(calcularResultadoAcademico(e)).toMatchObject({ planoCompleto: false, etapaRegularCompleta: false, pontosEfetivos: null, aprovacaoDisciplina: "PENDENTE" });
  });

  it("sem regra retorna totais/corte/máximo null e não assume100", () => {
    const e = entrada("120.00", "120.00");
    Object.assign(e.plano, { regraPontuacaoId: null, totalPontos: null, planoCompleto: false, subgrupos: [] });
    const r = calcularResultadoAcademico(e);
    expect(r).toMatchObject({ regraPontuacaoId: null, totalPontos: null, cortePontos: null, valorMaximoRecuperacao: null,
      planoCompleto: false, etapaRegularCompleta: false, pontosEfetivos: null, percentualResultado: null,
      elegivelRecuperacaoPorNota: false, aprovacaoDisciplina: "PENDENTE" });
    expect(r.motivos).toContain("REGRA_AUSENTE");
  });

  it("configuração sem avaliações não completa etapa por vacuidade", () => {
    const e = entrada(); e.avaliacoes = []; e.notasPorAvaliacao.clear();
    e.plano.planoCompleto = false;
    const r = calcularResultadoAcademico(e);
    expect(r).toMatchObject({ avaliacoesRegulares: 0, avaliacoesLancadas: 0, avaliacoesSemNota: [],
      etapaRegularCompleta: false, pontosEfetivos: null, resultadoPorNota: "NAO_LANCADA", aprovacaoDisciplina: "PENDENTE" });
    expect(r.motivos).toContain("SEM_NOTAS");
  });
});

describe("recuperação usa máximo e maior resultado, sem soma", () => {
  it.each([
    ["120.00", "60.00", "48.00", "60.00", "INSUFICIENTE", "NAO_APROVADA"],
    ["120.00", "60.00", "72.00", "72.00", "SUFICIENTE", "APROVADA"],
    ["120.00", "60.00", "90.00", "90.00", "SUFICIENTE", "APROVADA"],
    ["120.00", "72.00", "90.00", "90.00", "SUFICIENTE", "APROVADA"],
    ["100.00", "80.00", "70.00", "80.00", "SUFICIENTE", "APROVADA"],
    ["100.00", "70.00", "80.00", "80.00", "SUFICIENTE", "APROVADA"],
    ["300.00", "150.00", "179.99", "179.99", "INSUFICIENTE", "NAO_APROVADA"],
    ["300.00", "150.00", "180.00", "180.00", "SUFICIENTE", "APROVADA"],
    ["100.01", "50.00", "60.00", "60.00", "INSUFICIENTE", "NAO_APROVADA"],
    ["100.01", "50.00", "60.01", "60.01", "SUFICIENTE", "APROVADA"],
  ] as const)("total%s regular%s REC%s produz efetivos%s", (total, regular, rec, efetivos, estado, aprovacao) => {
    const r = calcularResultadoAcademico(entrada(total, regular, rec));
    expect(r).toMatchObject({ pontosRecuperacao: rec, valorMaximoRecuperacao: total, pontosEfetivos: efetivos,
      resultadoPorNota: estado, aprovacaoDisciplina: aprovacao, avaliacoesRegulares: 1, avaliacoesLancadas: 1 });
    if (estado === "INSUFICIENTE") expect(r.motivos).toContain("ABAIXO_DO_CORTE");
    else expect(r.motivos).not.toContain("ABAIXO_DO_CORTE");
    expect(r.motivos).not.toContain("RECUPERACAO_PENDENTE");
  });

  it("REC zero é registro insuficiente, REC ausente mantém espera e elegibilidade", () => {
    const ausente = calcularResultadoAcademico(entrada("120.00", "60.00", null));
    const zero = calcularResultadoAcademico(entrada("120.00", "60.00", "0.00"));
    expect(ausente).toMatchObject({ pontosRecuperacao: null, resultadoPorNota: "EM_RECUPERACAO", aprovacaoDisciplina: "PENDENTE", elegivelRecuperacaoPorNota: true });
    expect(ausente.motivos).toContain("RECUPERACAO_PENDENTE");
    expect(zero).toMatchObject({ pontosRecuperacao: "0.00", pontosEfetivos: "60.00", resultadoPorNota: "INSUFICIENTE", aprovacaoDisciplina: "NAO_APROVADA", elegivelRecuperacaoPorNota: true });
    expect(zero.motivos).not.toContain("RECUPERACAO_PENDENTE");
  });
});

describe("frequência consolidada e aprovação distinta do resultado por nota", () => {
  it.each([
    { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE", aprovacao: "APROVADA" },
    { presencas: 4, faltas: 1, percentual: 80, situacao: "ALERTA", requisito: "SUFICIENTE", aprovacao: "APROVADA" },
    { presencas: 8001, faltas: 1999, percentual: 80.01, situacao: "REGULAR", requisito: "SUFICIENTE", aprovacao: "APROVADA" },
    { presencas: 1, faltas: 1, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE", aprovacao: "NAO_APROVADA" },
    { presencas: 0, faltas: 20, percentual: 0, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE", aprovacao: "NAO_APROVADA" },
    { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE", aprovacao: "PENDENTE" },
  ] as const)("nota suficiente com frequência$percentual/$requisito produz$aprovacao", (caso) => {
    const e = entrada("120.00", caso.situacao === "ALERTA" ? "72.00" : "120.00");
    const { aprovacao, ...frequencia } = caso; e.frequencia = frequencia;
    const r = calcularResultadoAcademico(e);
    expect(r.resultadoPorNota).toBe("SUFICIENTE"); expect(r.aprovacaoDisciplina).toBe(aprovacao);
    expect(r.frequencia).toEqual(frequencia);
    if (frequencia.requisito === "PENDENTE") expect(r.motivos).toContain("FREQUENCIA_PENDENTE");
    if (frequencia.requisito === "INSUFICIENTE") expect(r.motivos).toContain("FREQUENCIA_INSUFICIENTE");
  });

  it("usa o requisito consolidado e preserva valores recebidos sem refazer fórmula", () => {
    const e = entrada();
    e.frequencia = { presencas: 1, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" };
    const r = calcularResultadoAcademico(e);
    expect(r.frequencia).toEqual(e.frequencia); expect(r.aprovacaoDisciplina).toBe("APROVADA");
  });

  it("faltas não removem elegibilidade por nota; REC suficiente não supre frequência", () => {
    const e = entrada("120.00", "60.00", "90.00");
    e.frequencia = { presencas: 1, faltas: 1, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" };
    expect(calcularResultadoAcademico(e)).toMatchObject({ resultadoPorNota: "SUFICIENTE", elegivelRecuperacaoPorNota: true, aprovacaoDisciplina: "NAO_APROVADA" });
    e.notasPorAvaliacao.delete(RECUPERACAO);
    expect(calcularResultadoAcademico(e)).toMatchObject({ resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true, aprovacaoDisciplina: "NAO_APROVADA" });
    e.notasPorAvaliacao.set(REGULAR, "72.00");
    expect(calcularResultadoAcademico(e).elegivelRecuperacaoPorNota).toBe(false);
  });

  it("etapa incompleta continua pendente mesmo com frequência insuficiente", () => {
    const e = entrada("120.00", null, "120.00");
    e.frequencia = { presencas: 0, faltas: 1, percentual: 0, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" };
    const r = calcularResultadoAcademico(e);
    expect(r.aprovacaoDisciplina).toBe("PENDENTE");
    expect(r.motivos).toEqual(expect.arrayContaining(["NOTAS_PENDENTES", "SEM_NOTAS", "FREQUENCIA_INSUFICIENTE"]));
  });

  it("nota insuficiente após REC impede aprovação mesmo quando frequência está pendente", () => {
    const e = entrada("120.00", "60.00", "48.00");
    e.frequencia = { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" };
    const r = calcularResultadoAcademico(e);
    expect(r.aprovacaoDisciplina).toBe("NAO_APROVADA");
    expect(r.motivos).toEqual(expect.arrayContaining(["ABAIXO_DO_CORTE", "FREQUENCIA_PENDENTE"]));
  });
});

describe("composição pura e tipos históricos", () => {
  it.each(["REGULAR", "PROVA", "TPI", "TRABALHO"] as const)("tipo%s permanece regular sem normalização incidental", (tipo) => {
    const e = entrada(); e.avaliacoes[0].tipo = tipo;
    const antes = structuredClone(e);
    const r = calcularResultadoAcademico(e);
    expect(r).toMatchObject({ avaliacoesRegulares: 1, pontosRegularesObtidos: "72.00", resultadoPorNota: "SUFICIENTE" });
    expect(e).toEqual(antes);
  });

  it("ignora notas de avaliações fora da entrada e não altera mapa/plano/frequência", () => {
    const e = entrada(); e.notasPorAvaliacao.set("avaliacao-fora-da-oferta", "999999999999999999999.99");
    const antes = structuredClone(e);
    const r = calcularResultadoAcademico(e);
    expect(r.pontosRegularesObtidos).toBe("72.00"); expect(r.avaliacoesLancadas).toBe(1);
    expect(e).toEqual(antes); expect(calcularResultadoAcademico(e)).toEqual(r);
    expect(new Set(r.motivos).size).toBe(r.motivos.length);
  });
});
