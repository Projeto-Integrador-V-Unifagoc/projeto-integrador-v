// Pasta models/interface.ts para que varios outros arquivos possam acessar as interfaces abaixo.

export interface Aluno {
  idAluno?: number;
  alunoNome: string;
  alunoEmail: string;
  alunoMatricula: string;
}

export interface Disciplina {
  idDisciplina?: number;
  disciplinaNome: string;
  disciplinaCodigo: string;
}

export type TipoAvaliacao = "PROVA" | "TPI" | "TRABALHO";

export interface AvaliacaoPayload {
  id_disciplina: number;
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string | undefined;
  texto_tarefa?: string | undefined;
  valor_avaliacao: number;
  data_avaliacao: string;
  data_devolucao_avaliacao?: string | null | undefined;
}

export interface Avaliacao extends AvaliacaoPayload {
  id_avaliacao?: number;
}

export interface Nota {
  idNotas?: number;
  idAvaliacao: number;
  idDisciplina: number;
  idAluno: number;
  valorNota: number;
}

export interface Frequencia {
  idFrequencia?: number;
  idAluno: number;
  frequenciaValor: number;
  situacaoFrequencia: boolean;
}

export interface NotaFinal {
  idNotaFinal?: number;
  idDisciplina: number;
  idAluno: number;
  notaFinalValor: number;
  situacaoNotaFinal: boolean;
}

export interface Aprovacao {
  idAprovacao?: number;
  idFrequencia: number;
  idNotaFinal: number;
  idAluno: number;
  idDisciplina: number;
  statusAprovacao: boolean;
}
