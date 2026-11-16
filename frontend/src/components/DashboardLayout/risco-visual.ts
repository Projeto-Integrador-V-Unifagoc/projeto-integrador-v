import type { TomEstado } from "./dashboard-estilos";

/** Nível de risco exibido nos dashboards (aluno e professor usam a mesma regra). */
export type NivelRiscoVisual = "alto" | "medio" | "sem-risco" | "sem-dados";

// "Sem risco" fica neutro, não verde: a cor fica reservada para o que pede ação.
export const RISCO_VISUAL: Record<NivelRiscoVisual, { rotulo: string; tom: TomEstado }> = {
  alto: { rotulo: "Risco alto", tom: "critico" },
  medio: { rotulo: "Risco médio", tom: "atencao" },
  "sem-risco": { rotulo: "Sem risco", tom: "neutro" },
  "sem-dados": { rotulo: "Sem dados", tom: "neutro" },
};
