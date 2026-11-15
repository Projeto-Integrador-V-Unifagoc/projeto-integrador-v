export interface HorarioOfertaCommand {
  id: string;
  turma_disciplina_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  local: string | null;
  vigencia_inicio: string;
  vigencia_fim: string;
  ativo: boolean;
}
