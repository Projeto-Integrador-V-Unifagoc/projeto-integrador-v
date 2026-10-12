import type { SubgrupoAvaliacao } from "./RegraPontuacao";

export interface SubgrupoPlanoAvaliacao extends Omit<SubgrupoAvaliacao, "ordem"> {
  pontosDistribuidos: string;
  saldoPontos: string;
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

export interface AvaliacaoDoPlano {
  id: string;
  subgrupo_id: string | null;
  tipo_avaliacao: string;
  valor: string;
}
