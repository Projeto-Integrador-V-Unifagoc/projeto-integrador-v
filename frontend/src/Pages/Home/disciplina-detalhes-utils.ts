import type { DisciplinaBoletim } from "../../models/nota-model";

export const META_PONTOS = 60;
export const FREQUENCIA_MINIMA = 75;

export type SituacaoProjecaoNota =
  | "plano-incompleto"
  | "meta-atingida"
  | "alcancavel"
  | "recuperacao";

export interface ProjecaoNota {
  situacao: SituacaoProjecaoNota;
  totalPlanejado: number;
  pontosDisponiveis: number;
  pontosParaMeta: number;
  percentualNecessario: number | null;
}

export function calcularProjecaoNota(
  disciplina: DisciplinaBoletim | null,
): ProjecaoNota | null {
  if (!disciplina) return null;

  const avaliacoesRegulares = disciplina.avaliacoes.filter(
    (avaliacao) => avaliacao.tipo !== "RECUPERACAO",
  );
  const totalPlanejado = avaliacoesRegulares.reduce(
    (soma, avaliacao) => soma + avaliacao.valorMaximo,
    0,
  );
  const pontosDisponiveis = avaliacoesRegulares
    .filter((avaliacao) => !avaliacao.lancada)
    .reduce((soma, avaliacao) => soma + avaliacao.valorMaximo, 0);
  const pontosParaMeta = Math.max(0, META_PONTOS - disciplina.pontosObtidos);

  if (totalPlanejado !== 100) {
    return {
      situacao: "plano-incompleto",
      totalPlanejado,
      pontosDisponiveis,
      pontosParaMeta,
      percentualNecessario: null,
    };
  }

  if (pontosParaMeta === 0) {
    return {
      situacao: "meta-atingida",
      totalPlanejado,
      pontosDisponiveis,
      pontosParaMeta,
      percentualNecessario: 0,
    };
  }

  if (pontosDisponiveis === 0 || pontosParaMeta > pontosDisponiveis) {
    return {
      situacao: "recuperacao",
      totalPlanejado,
      pontosDisponiveis,
      pontosParaMeta,
      percentualNecessario: null,
    };
  }

  return {
    situacao: "alcancavel",
    totalPlanejado,
    pontosDisponiveis,
    pontosParaMeta,
    percentualNecessario: Number(
      ((pontosParaMeta / pontosDisponiveis) * 100).toFixed(1),
    ),
  };
}

export interface ProjecaoFrequencia {
  margemFaltas: number;
  presencasParaRecuperar: number;
}

export function calcularProjecaoFrequencia(
  presencas: number,
  faltas: number,
): ProjecaoFrequencia | null {
  const total = presencas + faltas;
  if (total === 0) return null;

  const minimo = FREQUENCIA_MINIMA / 100;
  const percentualAtual = presencas / total;

  if (percentualAtual < minimo) {
    return {
      margemFaltas: 0,
      presencasParaRecuperar: Math.ceil(
        (minimo * total - presencas) / (1 - minimo),
      ),
    };
  }

  return {
    margemFaltas: Math.max(0, Math.floor(presencas / minimo - total + 1e-9)),
    presencasParaRecuperar: 0,
  };
}
