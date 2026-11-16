import { Box } from "@mui/material";
import { sxSelo } from "./dashboard-estilos";
import { RISCO_VISUAL } from "./risco-visual";
import type { NivelRiscoVisual } from "./risco-visual";

/** Chip com ponto ("● Risco alto"). O estado vai por texto e cor juntos (WCAG 1.4.1). */
export default function SeloRisco({ nivel, titulo }: { nivel: NivelRiscoVisual; titulo?: string }) {
  const { rotulo, tom } = RISCO_VISUAL[nivel];
  return (
    <Box component="span" title={titulo} sx={sxSelo(tom, { ponto: true })}>
      {rotulo}
    </Box>
  );
}
