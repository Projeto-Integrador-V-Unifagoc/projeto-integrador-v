export type StatusMatrizCurricular = "RASCUNHO" | "VIGENTE" | "ENCERRADA";

export interface MatrizCurricularCommand {
  id: string;
  curso_id: string;
  codigo: string;
  versao: string;
  status: StatusMatrizCurricular;
  vigencia_inicio: string;
  vigencia_fim?: string | null;
  publicada_em?: Date | null;
}
