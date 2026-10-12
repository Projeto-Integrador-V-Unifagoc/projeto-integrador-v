import type { PlanoAvaliacao } from "../../avaliacao/models/PlanoAvaliacao";
import { ErroPontos, formatarPontos, parsePontos } from "../../avaliacao/models/Pontos";
import type { SituacaoFrequencia } from "../../frequencia/models/Frequencia";
import type { TipoAvaliacaoNota } from "./Nota";

export type ResultadoPorNota = "NAO_LANCADA" | "EM_ANDAMENTO" | "SUFICIENTE" | "EM_RECUPERACAO" | "INSUFICIENTE";
export type AprovacaoDisciplina = "PENDENTE" | "APROVADA" | "NAO_APROVADA";
export type RequisitoFrequencia = "PENDENTE" | "SUFICIENTE" | "INSUFICIENTE";
export type MotivoResultadoAcademico = "REGRA_AUSENTE" | "PLANO_INCOMPLETO" | "NOTAS_PENDENTES" | "SEM_NOTAS"
  | "ABAIXO_DO_CORTE" | "RECUPERACAO_PENDENTE" | "FREQUENCIA_PENDENTE" | "FREQUENCIA_INSUFICIENTE";

export interface FrequenciaResultadoAcademico {
  presencas: number;
  faltas: number;
  percentual: number | null;
  situacao: SituacaoFrequencia;
  requisito: RequisitoFrequencia;
}

export interface AvaliacaoResultadoAcademico {
  id: string;
  tipo: TipoAvaliacaoNota;
  valor: string;
}

export interface EntradaResultadoAcademico {
  turmaDisciplinaId: string;
  matriculaTurmaDisciplinaId: string;
  plano: PlanoAvaliacao;
  avaliacoes: AvaliacaoResultadoAcademico[];
  notasPorAvaliacao: Map<string, string>;
  /** Já consolidada pelo módulo de frequência; o cálculo de pontos não a refaz. */
  frequencia: FrequenciaResultadoAcademico;
}

export interface ResultadoAcademico {
  contratoVersao: 2;
  turmaDisciplinaId: string;
  matriculaTurmaDisciplinaId: string;
  regraPontuacaoId: string | null;
  totalPontos: string | null;
  cortePontos: string | null;
  planoCompleto: boolean;
  avaliacoesRegulares: number;
  avaliacoesLancadas: number;
  avaliacoesSemNota: string[];
  etapaRegularCompleta: boolean;
  pontosRegularesObtidos: string;
  pontosMaximosLancados: string;
  indicadorRegular: { percentual: number | null; parcial: boolean; denominadorPontos: string };
  pontosRecuperacao: string | null;
  valorMaximoRecuperacao: string | null;
  pontosEfetivos: string | null;
  percentualResultado: number | null;
  resultadoPorNota: ResultadoPorNota;
  elegivelRecuperacaoPorNota: boolean;
  frequencia: FrequenciaResultadoAcademico;
  aprovacaoDisciplina: AprovacaoDisciplina;
  motivos: MotivoResultadoAcademico[];
}

/** 60% de cada centésimo corresponde a seis milésimos de ponto. */
function formatarCorte(total: bigint): string {
  const milesimos = total * 6n;
  const fracao = (milesimos % 1000n).toString().padStart(3, "0");
  return `${milesimos / 1000n}.${fracao.endsWith("0") ? fracao.slice(0, 2) : fracao}`;
}

/** Arredondamento somente da exibição, após a divisão inteira exata. */
function percentualExibido(pontos: bigint, denominador: bigint): number | null {
  if (denominador === 0n) return null;
  const centesimosPercentuais = (pontos * 20_000n + denominador) / (2n * denominador);
  return Number(centesimosPercentuais) / 100;
}

function lerNota(valor: unknown, maximo: bigint, campo: string): bigint {
  const pontos = parsePontos(valor, { campo });
  if (pontos > maximo) throw new ErroPontos("VALOR_INVALIDO", "A nota deve estar entre zero e o máximo da avaliação.", campo);
  return pontos;
}

/**
 * Projeção pura de um plano e registros já restritos à oferta/matrícula.
 * O gateway determina orçamento/quantidade do plano; identidade e autorização
 * permanecem nos leitores. Nenhum dado recebido é alterado.
 */
export function calcularResultadoAcademico(entrada: EntradaResultadoAcademico): ResultadoAcademico {
  const { plano, avaliacoes, notasPorAvaliacao } = entrada;
  const temRegra = plano.regraPontuacaoId !== null && plano.totalPontos !== null;
  const total = temRegra ? parsePontos(plano.totalPontos, { positivo: true, campo: "totalPontos" }) : null;
  const regulares = avaliacoes.filter((a) => a.tipo !== "RECUPERACAO");
  const avaliacoesSemNota: string[] = [];
  let pontosRegulares = 0n;
  let maximosLancados = 0n;
  let maximosRegulares = 0n;
  let lancadas = 0;
  for (const avaliacao of regulares) {
    const maximo = parsePontos(avaliacao.valor, { positivo: true, campo: "valorMaximoAvaliacao" });
    maximosRegulares += maximo;
    if (!notasPorAvaliacao.has(avaliacao.id)) {
      avaliacoesSemNota.push(avaliacao.id);
      continue;
    }
    pontosRegulares += lerNota(notasPorAvaliacao.get(avaliacao.id), maximo, "valorNota");
    maximosLancados += maximo;
    lancadas += 1;
  }

  const recuperacoes = avaliacoes.filter((a) => a.tipo === "RECUPERACAO");
  if (recuperacoes.length > 1) throw new ErroPontos("VALOR_INVALIDO", "A oferta deve possuir uma única avaliação de recuperação.", "recuperacao");
  let pontosRecuperacao: bigint | null = null;
  const recuperacao = recuperacoes[0];
  if (recuperacao) {
    const maximo = parsePontos(recuperacao.valor, { positivo: true, campo: "valorMaximoRecuperacao" });
    if (total !== null && maximo !== total) {
      throw new ErroPontos("VALOR_INVALIDO", "O máximo da recuperação deve corresponder ao total da regra.", "valorMaximoRecuperacao");
    }
    if (notasPorAvaliacao.has(recuperacao.id)) pontosRecuperacao = lerNota(notasPorAvaliacao.get(recuperacao.id), maximo, "valorRecuperacao");
  }

  const planoCompleto = total !== null && plano.planoCompleto && maximosRegulares === total;
  const etapaRegularCompleta = planoCompleto && regulares.length > 0 && avaliacoesSemNota.length === 0;
  let pontosEfetivos: bigint | null = null;
  let resultadoPorNota: ResultadoPorNota;
  if (!etapaRegularCompleta) resultadoPorNota = lancadas === 0 ? "NAO_LANCADA" : "EM_ANDAMENTO";
  else {
    pontosEfetivos = pontosRecuperacao !== null && pontosRecuperacao > pontosRegulares ? pontosRecuperacao : pontosRegulares;
    resultadoPorNota = 5n * pontosEfetivos >= 3n * total! ? "SUFICIENTE"
      : pontosRecuperacao === null ? "EM_RECUPERACAO" : "INSUFICIENTE";
  }
  const elegivelRecuperacaoPorNota = etapaRegularCompleta && 5n * pontosRegulares < 3n * total!;
  const frequencia = { ...entrada.frequencia };
  let aprovacaoDisciplina: AprovacaoDisciplina = "PENDENTE";
  if (etapaRegularCompleta) {
    if (frequencia.requisito === "INSUFICIENTE" || resultadoPorNota === "INSUFICIENTE") aprovacaoDisciplina = "NAO_APROVADA";
    else if (resultadoPorNota === "SUFICIENTE" && frequencia.requisito === "SUFICIENTE") aprovacaoDisciplina = "APROVADA";
  }
  const motivos: MotivoResultadoAcademico[] = [];
  if (!temRegra) motivos.push("REGRA_AUSENTE");
  if (!planoCompleto) motivos.push("PLANO_INCOMPLETO");
  if (avaliacoesSemNota.length > 0) motivos.push("NOTAS_PENDENTES");
  if (lancadas === 0) motivos.push("SEM_NOTAS");
  if (resultadoPorNota === "EM_RECUPERACAO" || resultadoPorNota === "INSUFICIENTE") motivos.push("ABAIXO_DO_CORTE");
  if (resultadoPorNota === "EM_RECUPERACAO") motivos.push("RECUPERACAO_PENDENTE");
  if (frequencia.requisito === "PENDENTE") motivos.push("FREQUENCIA_PENDENTE");
  if (frequencia.requisito === "INSUFICIENTE") motivos.push("FREQUENCIA_INSUFICIENTE");
  const denominador = etapaRegularCompleta ? total! : maximosLancados;
  return {
    contratoVersao: 2, turmaDisciplinaId: entrada.turmaDisciplinaId,
    matriculaTurmaDisciplinaId: entrada.matriculaTurmaDisciplinaId,
    regraPontuacaoId: temRegra ? plano.regraPontuacaoId : null,
    totalPontos: total === null ? null : formatarPontos(total), cortePontos: total === null ? null : formatarCorte(total),
    planoCompleto, avaliacoesRegulares: regulares.length, avaliacoesLancadas: lancadas, avaliacoesSemNota, etapaRegularCompleta,
    pontosRegularesObtidos: formatarPontos(pontosRegulares), pontosMaximosLancados: formatarPontos(maximosLancados),
    indicadorRegular: { percentual: percentualExibido(pontosRegulares, denominador), parcial: !etapaRegularCompleta, denominadorPontos: formatarPontos(denominador) },
    pontosRecuperacao: pontosRecuperacao === null ? null : formatarPontos(pontosRecuperacao),
    valorMaximoRecuperacao: total === null ? null : formatarPontos(total),
    pontosEfetivos: pontosEfetivos === null ? null : formatarPontos(pontosEfetivos),
    percentualResultado: pontosEfetivos === null ? null : percentualExibido(pontosEfetivos, total!),
    resultadoPorNota, elegivelRecuperacaoPorNota, frequencia, aprovacaoDisciplina, motivos,
  };
}
