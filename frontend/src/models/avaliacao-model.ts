export type TipoAvaliacao = 'PROVA' | 'TPI' | 'TRABALHO';

export interface Avaliacao {
  id: string;                       
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string | null;
  data_lancamento: string;
  valor: number;
  nota?: number | null;
  data_devolucao?: string | null;
  aluno_turma_id?: string | null;
  turma_id: string;
}

export interface CriarAvaliacaoDTO {
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string;
  data_lancamento: string;
  valor: number;
  nota?: number;
  data_devolucao?: string | null;
  aluno_turma_id?: string | null;
  turma_id: string;
}

export type AtualizarAvaliacaoDTO = Partial<CriarAvaliacaoDTO>;

export const REGRAS_AVALIACAO = {
  maxProvas: 3,
  valorProva: 20,
  valorTpi: 5,
  limiteTrabalhos: 25,
} as const;
