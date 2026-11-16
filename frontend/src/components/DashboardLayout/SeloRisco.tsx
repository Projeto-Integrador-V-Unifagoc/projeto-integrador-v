import { Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { RISCO_VISUAL } from "./risco-visual";
import type { NivelRiscoVisual } from "./risco-visual";

export default function SeloRisco({ nivel, titulo }: { nivel: NivelRiscoVisual; titulo?: string }) {
  const { rotulo, cor } = RISCO_VISUAL[nivel];
  return (
    <Chip
      size="small"
      label={rotulo}
      title={titulo}
      sx={(theme) => ({
        fontWeight: 700,
        flexShrink: 0,
        bgcolor: cor === "default" ? theme.palette.grey[100] : alpha(theme.palette[cor].main, 0.12),
        color: cor === "default" ? "text.secondary" : theme.palette[cor].dark,
      })}
    />
  );
}
