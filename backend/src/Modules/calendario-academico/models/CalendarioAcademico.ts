export type TipoEventoAcademico = "FERIADO" | "RECESSO" | "SUSPENSAO" | "EVENTO";

export interface EventoAcademicoCommand {
  id: string;
  periodo_letivo_id: string;
  tipo: TipoEventoAcademico;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  bloqueia_aulas: boolean;
}

export interface OcorrenciaAulaPlanejada {
  horarioId: string;
  turmaDisciplinaId: string;
  professorId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string | null;
}
