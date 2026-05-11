export type TipoAvaliacao = 'PROVA' | 'TPI' | 'TRABALHO';

export interface Avaliacao {
  id: string;                        
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string | null;
  data_lancamento: string | Date;
  valor: number;
  nota?: number | null;
  data_devolucao?: string | Date | null;
  aluno_turma_id?: string | null;     
  turma_id: string;                   
}

export interface CriarAvaliacaoDTO {
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string;
  data_lancamento: string | Date;
  valor: number;
  nota?: number;
  data_devolucao?: string | Date | null;
  aluno_turma_id?: string | null;
  turma_id: string;
}

export interface AtualizarAvaliacaoDTO {
  tipo_avaliacao?: TipoAvaliacao;
  descricao_avaliacao?: string | null;
  data_lancamento?: string | Date;
  valor?: number;
  nota?: number | null;
  data_devolucao?: string | Date | null;
  aluno_turma_id?: string | null;
  turma_id?: string;
}
