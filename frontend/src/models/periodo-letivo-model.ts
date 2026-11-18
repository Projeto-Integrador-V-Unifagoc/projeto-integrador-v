export interface PeriodoLetivoResponse {
  id: string
  codigo: string
  ano: number
  semestre: number
  data_inicio: string
  data_fim: string
  ativo: boolean
  status: string
}

export interface PeriodoLetivoRequest {
  codigo: string
  ano: number
  semestre: number
  dataInicio: string
  dataFim: string
  ativo?: boolean
  status: string
}

export interface PeriodoLetivoView {
  id: string
  codigo: string
  semestre: string
  inicio: string
  fim: string
  status: string
  ativo: boolean
}

export type TipoEventoAcademico = "FERIADO" | "RECESSO" | "SUSPENSAO" | "EVENTO";

export interface EventoAcademico {
  id: string;
  periodo_letivo_id: string;
  tipo: TipoEventoAcademico;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  bloqueia_aulas: boolean;
}

export interface GeracaoAulasResumo {
  simulado: boolean;
  periodo: { id: string; codigo: string; dataInicio: string; dataFim: string; status: string };
  intervalo: { inicio: string; fim: string };
  horariosAtivos: number;
  ocorrenciasPrevistas: number;
  excluidasPorCalendario: number;
  novas: number;
  existentes: number;
  criadas?: number;
  reativadas?: number;
  canceladas?: number;
  preservadasComChamada?: number;
}
