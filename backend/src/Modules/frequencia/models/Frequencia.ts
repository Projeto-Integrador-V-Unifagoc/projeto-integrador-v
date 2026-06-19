export type StatusFrequencia = "PRESENTE" | "AUSENTE";
export type SituacaoFrequencia = "REGULAR" | "ALERTA" | "RISCO_REPROVACAO";
export type PerfilFrequencia = "PROFESSOR" | "ALUNO" | "COORDENADOR";

export interface ContextoAutenticado {
  usuarioId: string;
  perfil: PerfilFrequencia;
  professorId?: string;
  alunoId?: string;
}

export interface RegistroFrequenciaRequest {
  alunoId: string;
  status: StatusFrequencia;
}

export interface RegistrarFrequenciaRequest {
  turmaDisciplinaId: string;
  aulaId?: string;
  data: string;
  registros: RegistroFrequenciaRequest[];
}

export interface EditarFrequenciaRequest {
  status: StatusFrequencia;
}

export interface FrequenciaRegistro {
  id: string;
  aulaId: string;
  matriculaTurmaDisciplinaId: string;
  alunoId: string;
  turmaDisciplinaId: string;
  status: StatusFrequencia;
  data: string;
  justificativa?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface TurmaFrequencia {
  id: string;
  turmaDisciplinaId: string;
  turmaId: string;
  semestre: string;
  sigla: string;
  descricao: string;
  disciplina: { id: string; codigo: string; nome: string };
  curso: { id: string; nome: string };
}

export interface AlunoChamada {
  id: string;
  matriculaTurmaDisciplinaId: string;
  matricula: number;
  nome: string;
  statusMatricula: string;
  percentualAtual: number;
  frequenciaId?: string;
  status: StatusFrequencia;
  justificativa?: string;
}

export interface ConsolidadoFrequencia {
  alunoId: string;
  alunoNome: string;
  turmaDisciplinaId: string;
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
  turmaDisciplinaId: string;
  disciplinaId: string;
  disciplinaNome: string;
  data: string;
  status: StatusFrequencia;
  justificativa?: string;
}

function formatDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export class FrequenciaMapper {
  static registro(row: any): FrequenciaRegistro {
    return {
      id: row.id,
      aulaId: row.aula_id,
      matriculaTurmaDisciplinaId: row.matricula_turma_disciplina_id,
      alunoId: row.aluno_id,
      turmaDisciplinaId: row.turma_disciplina_id,
      status: row.status,
      data: formatDate(row.data),
      justificativa: row.justificativa,
      criadoEm: row.created_at || row.criado_em,
      atualizadoEm: row.updated_at || row.atualizado_em,
    };
  }
}
