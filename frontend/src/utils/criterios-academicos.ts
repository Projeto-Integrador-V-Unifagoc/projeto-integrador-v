// Critérios acadêmicos usados pelos dashboards de aluno e professor (mesmos do backend,
// HomeProfessorService.nivel): frequência < 75% = risco alto; média < 60% ou frequência ≤ 80% = risco médio.
// Fonte única no frontend: os módulos de regras reexportam daqui.

/** Frequência mínima exigida pelo Regimento (%). */
export const FREQUENCIA_MINIMA = 75;
/** Até este valor (inclusive) a frequência ainda conta como risco médio (%). */
export const FREQUENCIA_LIMITROFE = 80;
/** Média de referência para aprovação (% do valor distribuído, ou pontos sobre 100). */
export const MEDIA_REFERENCIA = 60;
/** Abaixo deste valor a média é tratada como ponto grave (%). */
export const MEDIA_CRITICA = 40;
