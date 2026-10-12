export type TipoAvaliacao = "REGULAR" | "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";

export interface Avaliacao {
  id: string;
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string | null;
  data_lancamento: string;
  valor: string;
  subgrupo_id: string | null;
  regraPontuacaoId: string | null;
  primeiraNotaEm: string | null;
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
  tipo_avaliacao?: "REGULAR";
  subgrupo_id: string;
  descricao_avaliacao?: string;
  data_lancamento: string;
  valor: string;
  data_devolucao?: string | null;
  turma_disciplina_id: string;
}

export type AtualizarAvaliacaoDTO = Partial<Omit<CriarAvaliacaoDTO, "tipo_avaliacao">> & { tipo_avaliacao?: TipoAvaliacao };

export interface SubgrupoPlanoAvaliacao {
  id: string;
  nome: string;
  orcamentoPontos: string;
  pontosDistribuidos: string;
  saldoPontos: string;
  modoQuantidade: "FIXA" | "SEM_LIMITE";
  quantidadeFixa: number | null;
  quantidadeAtual: number;
  quantidadeDisponivel: number | null;
  completo: boolean;
}

export interface PlanoAvaliacao {
  turmaDisciplinaId: string;
  regraPontuacaoId: string | null;
  totalPontos: string | null;
  planoCompleto: boolean;
  podeCriarRegular: boolean;
  motivosBloqueio: string[];
  subgrupos: SubgrupoPlanoAvaliacao[];
}

export interface ErroAvaliacao {
  codigo?: string;
  mensagem?: string;
  campos?: { campo: string; codigo?: string; mensagem: string }[];
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
