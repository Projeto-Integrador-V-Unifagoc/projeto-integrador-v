import { formatarPontos as formatarPontosTextuais } from "./pontos";

export type TipoAvaliacaoVisual = "REGULAR" | "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";

export const ROTULO_TIPO_AVALIACAO: Record<TipoAvaliacaoVisual, string> = {
  REGULAR: "Regular",
  PROVA: "Prova",
  TPI: "TPI",
  TRABALHO: "Trabalho",
  RECUPERACAO: "Recuperação",
};

export const COR_TIPO_AVALIACAO: Record<
  TipoAvaliacaoVisual,
  "error" | "warning" | "info" | "secondary"
> = {
  REGULAR: "info",
  PROVA: "error",
  TPI: "warning",
  TRABALHO: "info",
  RECUPERACAO: "secondary",
};

export const formatarPontos = (valor: string | null | undefined) =>
  valor == null ? "-" : `${formatarPontosTextuais(valor)} pts`;

export const formatarDataPtBr = (valor?: string | null) => {
  if (!valor) return "—";
  const dataIso = valor.slice(0, 10);
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  if (!ano || !mes || !dia) return valor;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(Date.UTC(ano, mes - 1, dia)),
  );
};
