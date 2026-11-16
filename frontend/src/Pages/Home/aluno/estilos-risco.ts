import { FREQUENCIA_LIMITROFE, FREQUENCIA_MINIMA, MEDIA_CRITICA, MEDIA_REFERENCIA } from "./regras-dashboard-aluno";

export type CorSemantica = "error" | "warning" | "success" | "default";

export const corMedia = (media: number | null): CorSemantica =>
  media === null ? "default" : media < MEDIA_CRITICA ? "error" : media < MEDIA_REFERENCIA ? "warning" : "default";

export const corFrequencia = (frequencia: number | null): CorSemantica =>
  frequencia === null ? "default" : frequencia < FREQUENCIA_MINIMA ? "error" : frequencia <= FREQUENCIA_LIMITROFE ? "warning" : "default";

/** Cor do texto no tema MUI ("default" usa a cor normal do texto). */
export const corTexto = (cor: CorSemantica) => (cor === "default" ? "text.primary" : `${cor}.dark`);
