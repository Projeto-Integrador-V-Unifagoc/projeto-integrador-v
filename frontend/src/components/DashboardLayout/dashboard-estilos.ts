import type { SxProps, Theme } from "@mui/material/styles";

// Tokens visuais do layout padronizado dos dashboards (aluno e professor).
// Ficam isolados aqui para não alterar o tema global usado pelas demais telas.
export const CORES_DASHBOARD = {
  superficie: "#FFFFFF",
  superficieSutil: "#F6F8FA",
  borda: "#E3E8EF",
  bordaTracejada: "#C9D3DE",
  // Tom escuro do ciano da marca: contraste AA para texto pequeno e links sobre branco.
  acento: "#06789A",
  acentoHover: "#055F7A",
  marca: "#05B5E6",
  textoSuave: "#5F6B7A",
  textoApagado: "#7A8594",
} as const;

export const sxCartaoDashboard: SxProps<Theme> = {
  bgcolor: CORES_DASHBOARD.superficie,
  border: `1px solid ${CORES_DASHBOARD.borda}`,
  borderRadius: 3,
  boxShadow: "none",
};
