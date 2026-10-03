export type ModoQuantidade = "FIXA" | "SEM_LIMITE";

export interface SubgrupoAvaliacao {
  id: string;
  nome: string;
  orcamentoPontos: string;
  modoQuantidade: ModoQuantidade;
  quantidadeFixa: number | null;
  ordem: number;
}

export interface RegraPontuacao {
  id: string;
  cursoId: string;
  periodoLetivoId: string;
  totalPontos: string;
  origem: "CONFIGURADA" | "HISTORICA";
  versao: number;
  estado: "DISPONIVEL" | "PRESERVADA";
  usadaEm: string | null;
  criadaEm: string;
  atualizadaEm: string;
  criadaPorUsuarioId: string | null;
  atualizadaPorUsuarioId: string | null;
  subgrupos: SubgrupoAvaliacao[];
}

export interface SalvarRegraPontuacaoRequest {
  versaoEsperada: number | null;
  totalPontos: string;
  subgrupos: (Omit<SubgrupoAvaliacao, "id"> & { id?: string })[];
}

export interface SubgrupoRascunho {
  chave: string;
  id?: string;
  nome: string;
  orcamentoPontos: string;
  modoQuantidade: ModoQuantidade;
  quantidadeFixa: string;
}

export interface RascunhoRegraPontuacao {
  totalPontos: string;
  subgrupos: SubgrupoRascunho[];
}

export interface ErroRegraPontuacao {
  codigo?: string;
  mensagem?: string;
  message?: string;
  campos?: { campo: string; codigo: string; mensagem: string }[];
}
