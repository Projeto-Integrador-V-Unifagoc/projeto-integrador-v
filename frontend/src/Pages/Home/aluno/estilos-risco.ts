import { CORES_DASHBOARD, ESTADOS } from "../../../components/DashboardLayout/dashboard-estilos";
import { FREQUENCIA_LIMITROFE, FREQUENCIA_MINIMA, MEDIA_CRITICA, MEDIA_REFERENCIA } from "./regras-dashboard-aluno";

export type CorSemantica = "error" | "warning" | "success" | "default";

export const corMedia = (media: number | null): CorSemantica =>
  media === null ? "default" : media < MEDIA_CRITICA ? "error" : media < MEDIA_REFERENCIA ? "warning" : "default";

export const corFrequencia = (frequencia: number | null): CorSemantica =>
  frequencia === null ? "default" : frequencia < FREQUENCIA_MINIMA ? "error" : frequencia <= FREQUENCIA_LIMITROFE ? "warning" : "default";

/** Cor do texto de um número: tom escuro do estado (≥ 4,5:1) ou o texto normal. Nunca verde para "ok". */
export const corTexto = (cor: CorSemantica) =>
  cor === "error" ? ESTADOS.critico.texto : cor === "warning" ? ESTADOS.atencao.texto : CORES_DASHBOARD.texto;
