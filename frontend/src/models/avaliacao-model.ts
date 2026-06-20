export type TipoAvaliacao = "PROVA" | "TPI" | "TRABALHO";

export interface Avaliacao {
  id: string;
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string | null;
  data_lancamento: string;
  valor: number;
  data_devolucao?: string | null;
  turma_disciplina_id: string;
  turma_id?: string;
  turma_sigla?: string;
  turma_descricao?: string;
  disciplina_id?: string;
  disciplina_codigo?: string;
  disciplina_nome?: string;
  professor_id?: string;
  professor_nome?: string;
}

export interface CriarAvaliacaoDTO {
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string;
  data_lancamento: string;
  valor: number;
  data_devolucao?: string | null;
  turma_disciplina_id: string;
}

export type AtualizarAvaliacaoDTO = Partial<CriarAvaliacaoDTO>;

export const REGRAS_AVALIACAO = {
  maxProvas: 3,
  valorProva: 20,
  valorTpi: 5,
  limiteTrabalhos: 25,
} as const;

export interface AtribuicaoAvaliacao {
  id: string;
  professor_id: string;
  turma_id: string;
  turma_sigla: string;
  turma_descricao: string;
  disciplina_id: string;
  disciplina_codigo: string;
  disciplina_nome: string;
  professor_nome: string;
}
