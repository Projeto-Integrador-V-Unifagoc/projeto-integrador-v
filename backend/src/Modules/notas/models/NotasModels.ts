export type TipoAvaliacaoNota = "PROVA" | "TPI" | "TRABALHO";
export type SituacaoNota = "APROVADO" | "RECUPERACAO" | "REPROVADO" | "SEM_NOTA";

export interface Nota {
  id: string;
  tipo_avaliacao: TipoAvaliacaoNota;
  descricao_avaliacao?: string | null;
  data_lancamento: string | Date;
  valor: number;
  nota: number;
  data_devolucao?: string | Date | null;
  turma_disciplina_id: string;
  matricula_turma_disciplina_id: string;
}

export interface LancarNotaDTO {
  tipo_avaliacao: TipoAvaliacaoNota;
  descricao_avaliacao?: string | null;
  data_lancamento?: string | Date;
  valor: number;
  nota: number;
  data_devolucao?: string | Date | null;
  turma_disciplina_id: string;
  matricula_turma_disciplina_id?: string;
  aluno_id?: string;
}

export interface AtualizarNotaDTO {
  tipo_avaliacao?: TipoAvaliacaoNota;
  descricao_avaliacao?: string | null;
  data_lancamento?: string | Date;
  valor?: number;
  nota?: number;
  data_devolucao?: string | Date | null;
  turma_disciplina_id?: string;
  matricula_turma_disciplina_id?: string;
  aluno_id?: string;
}

export interface NotaDetalhada extends Nota {
  aluno_id: string;
  aluno_nome: string;
  aluno_matricula: number;
  matricula_id: string;
  turma_id: string;
  turma_sigla: string;
  turma_descricao: string;
  disciplina_id: string;
  disciplina_codigo: string;
  disciplina_nome: string;
  professor_id: string;
  professor_nome: string;
  periodo_letivo_id: string;
  periodo_letivo_codigo: string;
}

export interface BoletimAluno {
  alunoId: string;
  alunoNome: string;
  alunoMatricula: number;
  matriculaTurmaDisciplinaId: string;
  turmaDisciplinaId: string;
  turmaId: string;
  turma: string;
  disciplinaId: string;
  disciplinaCodigo: string;
  disciplinaNome: string;
  professorId: string;
  professorNome: string;
  periodoLetivo: string;
  avaliacoes: NotaDetalhada[];
  totalDistribuido: number;
  totalObtido: number;
  media: number;
  situacao: SituacaoNota;
}

export class NotaMapper {
  static toDomain(row: any): NotaDetalhada {
    return {
      id: row.id,
      tipo_avaliacao: row.tipo_avaliacao,
      descricao_avaliacao: row.descricao_avaliacao,
      data_lancamento: row.data_lancamento,
      valor: Number(row.valor ?? 0),
      nota: Number(row.nota ?? 0),
      data_devolucao: row.data_devolucao,
      turma_disciplina_id: row.turma_disciplina_id,
      matricula_turma_disciplina_id: row.matricula_turma_disciplina_id,
      aluno_id: row.aluno_id,
      aluno_nome: row.aluno_nome,
      aluno_matricula: Number(row.aluno_matricula),
      matricula_id: row.matricula_id,
      turma_id: row.turma_id,
      turma_sigla: row.turma_sigla,
      turma_descricao: row.turma_descricao,
      disciplina_id: row.disciplina_id,
      disciplina_codigo: row.disciplina_codigo,
      disciplina_nome: row.disciplina_nome,
      professor_id: row.professor_id,
      professor_nome: row.professor_nome,
      periodo_letivo_id: row.periodo_letivo_id,
      periodo_letivo_codigo: row.periodo_letivo_codigo,
    };
  }
}
