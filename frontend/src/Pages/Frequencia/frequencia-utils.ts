import { sxChipSelo, type TomEstado } from "../../components/DashboardLayout/dashboard-estilos";
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

const ROTULO_SITUACAO: Record<SituacaoFrequencia, string> = {
  REGULAR: "Regular",
  ALERTA: "Alerta",
  RISCO_REPROVACAO: "Risco de reprovação",
  NAO_LANCADO: "Não lançado",
};

// Situação: a cor reforça, mas o rótulo sempre comunica o estado (sem depender só de cor).
export const rotuloSituacao = (s: SituacaoFrequencia): string => ROTULO_SITUACAO[s] ?? s;

const COR_STATUS: Record<StatusFrequencia, "success" | "error"> = { PRESENTE: "success", AUSENTE: "error" };
const ROTULO_STATUS: Record<StatusFrequencia, string> = { PRESENTE: "Presente", AUSENTE: "Ausente" };

export const corStatus = (s: StatusFrequencia) => COR_STATUS[s];
export const rotuloStatus = (s: StatusFrequencia) => ROTULO_STATUS[s];

// Tons no padrão visual (selos): risco de reprovação é crítico, alerta e ausência são atenção;
// regular, não lançado e presente ficam neutros.
const TOM_SITUACAO: Record<SituacaoFrequencia, TomEstado> = { REGULAR: "neutro", ALERTA: "atencao", RISCO_REPROVACAO: "critico", NAO_LANCADO: "neutro" };
const TOM_STATUS: Record<StatusFrequencia, TomEstado> = { PRESENTE: "neutro", AUSENTE: "atencao" };

export const tomSituacaoFrequencia = (s: SituacaoFrequencia): TomEstado => TOM_SITUACAO[s] ?? "neutro";
export const tomStatusFrequencia = (s: StatusFrequencia): TomEstado => TOM_STATUS[s] ?? "neutro";

/** Tom e ponto do selo de presença: a mesma regra para o selo das tabelas e o Chip da chamada. */
export const seloStatusFrequencia = (s: StatusFrequencia) => {
  const tom = tomStatusFrequencia(s);
  return { tom, opcoes: { ponto: tom !== "neutro" } };
};

export const sxChipStatusFrequencia = (s: StatusFrequencia) => {
  const { tom, opcoes } = seloStatusFrequencia(s);
  return sxChipSelo(tom, opcoes);
};
