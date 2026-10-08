export type TipoAvaliacaoNota = "REGULAR" | "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";

// Alias transitório do resultado por nota; não representa aprovação conjunta.
export type SituacaoNota =
  | "NAO_LANCADA"
  | "EM_ANDAMENTO"
  | "EM_RECUPERACAO"
  | "APROVADO"
  | "REPROVADO";

export type PerfilNota = "professor" | "aluno" | "secretaria" | "administrador";

export interface ItemLoteNota {
  alunoId: string;
  valor: string;
}

export interface SalvarLoteNotaRequest {
  itens: ItemLoteNota[];
  motivo?: string;
}

export interface AutorizacaoExcepcionalRequest {
  avaliacaoId: string;
  matriculaTurmaDisciplinaId?: string;
  motivo: string;
  prazoEmDias?: number;
}

export interface AvaliacaoResumo {
  id: string;
  tipo: TipoAvaliacaoNota;
  descricao: string | null;
  valor: string;
}

/** DTO textual de opções/lançamento. */
export interface AvaliacaoResumoPontos extends Omit<AvaliacaoResumo, "valor"> {
  valor: string;
}

/** Aliases de transporte derivados do contrato comum, sem outra decisão acadêmica. */
export function projetarBoletim(resultado: import("./ResultadoAcademico").ResultadoAcademico) {
  const situacoes: Record<import("./ResultadoAcademico").ResultadoPorNota, SituacaoNota> = {
    NAO_LANCADA: "NAO_LANCADA", EM_ANDAMENTO: "EM_ANDAMENTO", EM_RECUPERACAO: "EM_RECUPERACAO",
    SUFICIENTE: "APROVADO", INSUFICIENTE: "REPROVADO",
  };
  return { pontosObtidos: resultado.pontosRegularesObtidos, pontosMaximos: resultado.pontosMaximosLancados,
    mediaParcial: resultado.indicadorRegular.percentual, notaRecuperacao: resultado.pontosRecuperacao,
    mediaFinal: resultado.percentualResultado, situacao: situacoes[resultado.resultadoPorNota],
    etapaRegularCompleta: resultado.etapaRegularCompleta, elegivelRecuperacao: resultado.elegivelRecuperacaoPorNota,
    alerta: resultado.motivos.length > 0 || resultado.frequencia.situacao === "ALERTA", resultadoAcademico: resultado };
}
