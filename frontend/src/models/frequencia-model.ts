export type StatusFrequencia = "PRESENTE" | "AUSENTE";
export type SituacaoFrequencia = "REGULAR" | "ALERTA" | "RISCO_REPROVACAO" | "NAO_LANCADO";
export interface TurmaFrequencia { id: string; turmaDisciplinaId: string; turmaId: string; sigla: string; descricao: string; periodoLetivo: { codigo: string; dataInicio: string; dataFim: string; status: string }; disciplina: { id: string; codigo: string; nome: string }; curso: { id: string; nome: string } }
export interface LocalAula { id: string; codigo: string }
export interface AlunoChamada { id: string; matriculaTurmaDisciplinaId: string; matricula: number; nome: string; statusMatricula: string; percentualAtual: number; frequenciaId?: string; status: StatusFrequencia | null; motivoJustificativa?: string; observacaoJustificativa?: string }
export interface RegistrarFrequenciaPayload { turmaDisciplinaId: string; aulaId?: string; localId?: string; data: string; registros: Array<{ alunoId: string; status: StatusFrequencia }> }
export interface ConsolidadoFrequencia { alunoId: string; alunoNome: string; turmaDisciplinaId: string; disciplinaId: string; disciplinaNome: string; totalAulas: number; presencas: number; faltas: number; naoLancadas: number; percentual: number | null; situacao: SituacaoFrequencia }
export interface HistoricoFrequenciaAluno { id: string; aulaId: string; turmaDisciplinaId: string; disciplinaId: string; disciplinaNome: string; data: string; status: StatusFrequencia; motivoJustificativa?: string; observacaoJustificativa?: string }
