export type StatusFrequencia = "PRESENTE" | "AUSENTE";
export type SituacaoFrequencia = "REGULAR" | "ALERTA" | "RISCO_REPROVACAO";

export interface TurmaFrequencia {
  id: string;
  semestre: string;
  disciplina: { id: string; codigo: string; nome: string };
  curso: { id: string; nome: string };
}

export interface AlunoChamada {
  id: string;
  matricula: number;
  nome: string;
  statusMatricula: string;
  percentualAtual: number;
  frequenciaId?: string;
  status: StatusFrequencia;
  justificativa?: string;
}

export interface RegistrarFrequenciaPayload {
  turmaId: string;
  data: string;
  registros: Array<{ alunoId: string; status: StatusFrequencia }>;
}

export interface ConsolidadoFrequencia {
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  disciplinaId: string;
  disciplinaNome: string;
  totalAulas: number;
  presencas: number;
  faltas: number;
  percentual: number;
  situacao: SituacaoFrequencia;
}

export interface HistoricoFrequenciaAluno {
  id: string;
  aulaId: string;
  turmaId: string;
  disciplinaId: string;
  disciplinaNome: string;
  data: string;
  status: StatusFrequencia;
  justificativa?: string;
}
