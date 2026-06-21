export type TipoAvaliacaoNota = "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";

// Situacao academica derivada da media (secao 5.3 da spec).
export type SituacaoNota =
  | "NAO_LANCADA"
  | "EM_ANDAMENTO"
  | "EM_RECUPERACAO"
  | "APROVADO"
  | "REPROVADO";

export type PerfilNota = "professor" | "aluno" | "secretaria";

export interface ItemLoteNota {
  alunoId: string;
  valor: number;
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

// Resultado consolidado do calculo de media de uma disciplina para um aluno.
export interface BoletimDisciplina {
  pontosObtidos: number;
  pontosMaximos: number;
  mediaParcial: number | null;
  notaRecuperacao: number | null;
  mediaFinal: number | null;
  situacao: SituacaoNota;
  etapaRegularCompleta: boolean;
  elegivelRecuperacao: boolean;
  alerta: boolean;
}

export interface AvaliacaoResumo {
  id: string;
  tipo: TipoAvaliacaoNota;
  descricao: string | null;
  valor: number;
}

const arredondar = (valor: number) => Number(valor.toFixed(2));

// Calculo central da media (RN-07, RN-08, RN-09, secao 5.1 e 5.3).
// Apenas avaliacoes com nota lancada para o aluno entram no denominador.
export function calcularBoletim(
  avaliacoes: AvaliacaoResumo[],
  notasPorAvaliacao: Map<string, number>,
): BoletimDisciplina {
  const regulares = avaliacoes.filter((a) => a.tipo !== "RECUPERACAO");
  const recuperacao = avaliacoes.find((a) => a.tipo === "RECUPERACAO");
  const regularesLancadas = regulares.filter((a) => notasPorAvaliacao.has(a.id));

  const pontosObtidos = arredondar(
    regularesLancadas.reduce((soma, a) => soma + Number(notasPorAvaliacao.get(a.id) ?? 0), 0),
  );
  const pontosMaximos = arredondar(regularesLancadas.reduce((soma, a) => soma + Number(a.valor), 0));
  const mediaParcial = pontosMaximos > 0 ? arredondar((pontosObtidos / pontosMaximos) * 100) : null;

  const totalMaximoRegular = arredondar(regulares.reduce((soma, a) => soma + Number(a.valor), 0));
  // A etapa somente termina quando o plano regular totaliza os 100 pontos
  // institucionais e todas essas avaliacoes possuem nota para o aluno.
  const etapaRegularCompleta =
    totalMaximoRegular === 100 && regularesLancadas.length === regulares.length;
  const notaRecuperacao =
    recuperacao && notasPorAvaliacao.has(recuperacao.id)
      ? arredondar(Number(notasPorAvaliacao.get(recuperacao.id)))
      : null;

  let situacao: SituacaoNota;
  let mediaFinal = mediaParcial;

  if (!etapaRegularCompleta) {
    situacao = mediaParcial === null ? "NAO_LANCADA" : "EM_ANDAMENTO";
  } else if ((mediaParcial as number) >= 60) {
    situacao = "APROVADO";
  } else if (notaRecuperacao !== null) {
    mediaFinal = arredondar(Math.max(mediaParcial as number, notaRecuperacao));
    situacao = mediaFinal >= 60 ? "APROVADO" : "REPROVADO";
  } else {
    situacao = "EM_RECUPERACAO";
  }

  const elegivelRecuperacao = etapaRegularCompleta && (mediaParcial as number) < 60;
  const alerta = mediaParcial !== null && mediaParcial < 60;

  return {
    pontosObtidos,
    pontosMaximos,
    mediaParcial,
    notaRecuperacao,
    mediaFinal,
    situacao,
    etapaRegularCompleta,
    elegivelRecuperacao,
    alerta,
  };
}
