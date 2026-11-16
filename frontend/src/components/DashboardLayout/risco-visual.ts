/** Nível de risco exibido nos dashboards (aluno e professor usam a mesma regra). */
export type NivelRiscoVisual = "alto" | "medio" | "sem-risco" | "sem-dados";

export const RISCO_VISUAL: Record<NivelRiscoVisual, { rotulo: string; cor: "error" | "warning" | "success" | "default" }> = {
  alto: { rotulo: "Risco alto", cor: "error" },
  medio: { rotulo: "Risco médio", cor: "warning" },
  "sem-risco": { rotulo: "Sem risco", cor: "success" },
  "sem-dados": { rotulo: "Sem dados", cor: "default" },
};
