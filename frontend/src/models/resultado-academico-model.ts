export type ResultadoPorNota = "NAO_LANCADA" | "EM_ANDAMENTO" | "SUFICIENTE" | "EM_RECUPERACAO" | "INSUFICIENTE";
export type AprovacaoDisciplina = "PENDENTE" | "APROVADA" | "NAO_APROVADA";
export type MotivoResultadoAcademico = "REGRA_AUSENTE" | "PLANO_INCOMPLETO" | "NOTAS_PENDENTES" | "SEM_NOTAS"
  | "ABAIXO_DO_CORTE" | "RECUPERACAO_PENDENTE" | "FREQUENCIA_PENDENTE" | "FREQUENCIA_INSUFICIENTE";

/** Projeção do servidor. Os percentuais são indicadores de exibição, nunca critérios locais. */
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
  frequencia: {
    presencas: number;
    faltas: number;
    percentual: number | null;
    situacao: "NAO_LANCADO" | "RISCO_REPROVACAO" | "ALERTA" | "REGULAR";
    requisito: "PENDENTE" | "SUFICIENTE" | "INSUFICIENTE";
  };
  aprovacaoDisciplina: AprovacaoDisciplina;
  motivos: MotivoResultadoAcademico[];
}

export const ROTULO_RESULTADO_NOTA: Record<ResultadoPorNota, string> = {
  NAO_LANCADA: "Não lançada", EM_ANDAMENTO: "Em andamento", SUFICIENTE: "Suficiente",
  EM_RECUPERACAO: "Em recuperação", INSUFICIENTE: "Insuficiente",
};
export const ROTULO_APROVACAO: Record<AprovacaoDisciplina, string> = {
  PENDENTE: "Pendente", APROVADA: "Aprovada", NAO_APROVADA: "Não aprovada",
};
export const ROTULO_MOTIVO: Record<MotivoResultadoAcademico, string> = {
  REGRA_AUSENTE: "Regra de pontuação ausente", PLANO_INCOMPLETO: "Plano incompleto",
  NOTAS_PENDENTES: "Notas pendentes", SEM_NOTAS: "Sem notas lançadas", ABAIXO_DO_CORTE: "Abaixo do corte",
  RECUPERACAO_PENDENTE: "Recuperação pendente", FREQUENCIA_PENDENTE: "Frequência pendente",
  FREQUENCIA_INSUFICIENTE: "Frequência insuficiente",
};
