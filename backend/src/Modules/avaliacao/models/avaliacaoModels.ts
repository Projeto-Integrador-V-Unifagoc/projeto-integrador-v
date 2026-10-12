export type TipoAvaliacao = "REGULAR" | "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";

export interface Avaliacao {
  id: string;
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string | null;
  data_lancamento: string | Date;
  valor: string;
  subgrupo_id: string | null;
  regraPontuacaoId: string | null;
  primeiraNotaEm: string | null;
  data_devolucao?: string | Date | null;
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
  tipo_avaliacao?: TipoAvaliacao;
  subgrupo_id: string | null;
  descricao_avaliacao?: string;
  data_lancamento: string;
  valor: string;
  data_devolucao?: string | null;
  turma_disciplina_id: string;
}

export interface AtualizarAvaliacaoDTO {
  tipo_avaliacao?: TipoAvaliacao;
  subgrupo_id?: string | null;
  descricao_avaliacao?: string | null;
  data_lancamento?: string;
  valor?: string;
  data_devolucao?: string | null;
  turma_disciplina_id?: string;
}

export interface ContextoAvaliacao {
  usuarioId: string;
  tipoUsuario: string;
}

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
