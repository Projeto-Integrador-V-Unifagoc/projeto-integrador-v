import type { SituacaoFrequencia } from "../models/Frequencia";

export type RequisitoFrequencia = "PENDENTE" | "SUFICIENTE" | "INSUFICIENTE";

export interface FrequenciaConsolidada {
  presencas: number;
  faltas: number;
  percentual: number | null;
  situacao: SituacaoFrequencia;
  requisito: RequisitoFrequencia;
}

/** Conserva a fórmula, o arredondamento e as classes do módulo de frequência. */
export function consolidarFrequencia(presencas: number, faltas: number): FrequenciaConsolidada {
  const contabilizadas = presencas + faltas;
  const percentual = contabilizadas ? Number((presencas / contabilizadas * 100).toFixed(2)) : null;
  return {
    presencas,
    faltas,
    percentual,
    situacao: percentual === null ? "NAO_LANCADO" : percentual < 75 ? "RISCO_REPROVACAO" : percentual <= 80 ? "ALERTA" : "REGULAR",
    requisito: percentual === null ? "PENDENTE" : percentual < 75 ? "INSUFICIENTE" : "SUFICIENTE",
  };
}
