export type StatusFrequencia = "PRESENTE" | "AUSENTE";
export type SituacaoFrequencia = "REGULAR" | "ALERTA" | "RISCO_REPROVACAO" | "NAO_LANCADO";

export interface RegistroFrequenciaRequest { alunoId: string; status: StatusFrequencia }
export interface RegistrarFrequenciaRequest {
  turmaDisciplinaId: string;
  aulaId?: string;
  localId?: string;
  data: string;
  registros: RegistroFrequenciaRequest[];
}
export interface JustificativaRequest { motivo: string; observacao?: string; confirmarSubstituicao?: boolean }
export interface ConsolidadoFrequencia {
  alunoId: string; alunoNome: string; turmaDisciplinaId: string; disciplinaId: string;
  disciplinaNome: string; totalAulas: number; presencas: number; faltas: number;
  naoLancadas: number; percentual: number | null; situacao: SituacaoFrequencia;
}

const data = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
export class FrequenciaMapper {
  static registro(row: any) {
    return {
      id: row.id, aulaId: row.aula_id, matriculaTurmaDisciplinaId: row.matricula_turma_disciplina_id,
      alunoId: row.aluno_id, turmaDisciplinaId: row.turma_disciplina_id, status: row.status,
      data: data(row.data), motivoJustificativa: row.justificativa_motivo || row.justificativa || null,
      observacaoJustificativa: row.justificativa_observacao || null,
      lancadaEm: row.lancada_em || row.created_at, atualizadoEm: row.updated_at,
    };
  }
}
