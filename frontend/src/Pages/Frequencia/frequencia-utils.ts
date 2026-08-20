import type { SituacaoFrequencia, StatusFrequencia } from "../../models/frequencia-model";

export type Aviso = { tipo: "success" | "error" | "info" | "warning"; texto: string };

// Data de hoje no fuso de São Paulo, no formato aceito pelo input date (AAAA-MM-DD).
export const hojeSP = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const perfilLocal = () => {
  try {
    return String(JSON.parse(localStorage.getItem("@UniEduca:user") || "{}").tipo_usuario || "").toLowerCase();
  } catch {
    return "";
  }
};

export const mensagemErro = (erro: unknown) => {
  const e = erro as { response?: { data?: { mensagem?: string } }; message?: string };
  return e.response?.data?.mensagem || e.message || "Não foi possível concluir a operação.";
};

export const formatarPercentual = (valor: number | null | undefined) =>
  valor == null ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(valor)}%`;

type ChipColor = "success" | "warning" | "error" | "default";

const COR_SITUACAO: Record<SituacaoFrequencia, ChipColor> = {
  REGULAR: "success",
  ALERTA: "warning",
  RISCO_REPROVACAO: "error",
  NAO_LANCADO: "default",
};

const ROTULO_SITUACAO: Record<SituacaoFrequencia, string> = {
  REGULAR: "Regular",
  ALERTA: "Alerta",
  RISCO_REPROVACAO: "Risco de reprovação",
  NAO_LANCADO: "Não lançado",
};

// Situação: a cor reforça, mas o rótulo sempre comunica o estado (sem depender só de cor).
export const corSituacao = (s: SituacaoFrequencia): ChipColor => COR_SITUACAO[s] ?? "default";
export const rotuloSituacao = (s: SituacaoFrequencia): string => ROTULO_SITUACAO[s] ?? s;

const COR_STATUS: Record<StatusFrequencia, "success" | "error"> = { PRESENTE: "success", AUSENTE: "error" };
const ROTULO_STATUS: Record<StatusFrequencia, string> = { PRESENTE: "Presente", AUSENTE: "Ausente" };

export const corStatus = (s: StatusFrequencia) => COR_STATUS[s];
export const rotuloStatus = (s: StatusFrequencia) => ROTULO_STATUS[s];
