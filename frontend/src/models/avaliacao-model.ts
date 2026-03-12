export type TipoAvaliacao = "PROVA" | "TPI" | "TRABALHO";

export interface AvaliacaoPayload {
  id_disciplina: number;
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao?: string;
  texto_tarefa?: string;
  valor_avaliacao: number;
  data_avaliacao: string;
  data_devolucao_avaliacao?: string;
}

export interface Avaliacao extends AvaliacaoPayload {
  id_avaliacao: number;
}

export const REGRAS_AVALIACAO = {
  maxProvas: 3,
  valorProva: 20,
  valorTpi: 5,
  limiteTrabalhos: 25,
} as const;
