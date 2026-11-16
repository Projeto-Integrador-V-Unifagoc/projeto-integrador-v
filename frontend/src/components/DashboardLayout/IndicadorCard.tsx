import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, sxCartaoDashboard } from "./dashboard-estilos";

export type TomIndicador = "primary" | "success" | "warning" | "error" | "info";

export interface IndicadorDashboard {
  id: string;
  titulo: string;
  icone: LucideIcon;
  tom?: TomIndicador;
  valor?: string;
  apoio?: string;
  /** Selo curto exibido ao lado do valor (ex.: "5,6%"). */
  destaque?: string;
  /** Texto colorido ao lado do valor (ex.: "+16,2 p.p. acima do mínimo"). */
  complemento?: { texto: string; tom?: TomIndicador | "neutro" };
  /** Selo no canto superior, no lugar do ícone (ex.: "Geral OK"). */
  selo?: { rotulo: string; tom?: TomIndicador };
}

export default function IndicadorCard({ titulo, icone: Icone, tom = "primary", valor = "—", apoio, destaque, complemento, selo }: Omit<IndicadorDashboard, "id">) {
  const theme = useTheme();
  const corDoTom = (t: TomIndicador) => (t === "primary" ? CORES_DASHBOARD.acento : theme.palette[t].dark);
  const cor = tom === "primary" ? CORES_DASHBOARD.acento : theme.palette[tom].main;
  const corSelo = selo ? corDoTom(selo.tom ?? tom) : cor;
  const corComplemento = !complemento || complemento.tom === "neutro" ? CORES_DASHBOARD.textoApagado : corDoTom(complemento.tom ?? tom);

  return (
    <Paper component="article" aria-label={titulo} sx={{ ...sxCartaoDashboard, p: 2, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Typography variant="body2" fontWeight={600} sx={{ color: CORES_DASHBOARD.textoSuave }}>
          {titulo}
        </Typography>
        {selo ? (
          <Box component="span" sx={{ fontSize: 12, fontWeight: 700, px: 1, py: 0.25, borderRadius: 1.5, whiteSpace: "nowrap", bgcolor: alpha(corSelo, 0.1), color: corSelo }}>
            {selo.rotulo}
          </Box>
        ) : (
          <Box
            aria-hidden="true"
            sx={{ width: 32, height: 32, borderRadius: 2, flexShrink: 0, display: "grid", placeItems: "center", bgcolor: alpha(cor, 0.1), color: cor }}
          >
            <Icone size={17} />
          </Box>
        )}
      </Stack>
      <Stack direction="row" alignItems="baseline" gap={1} mt={0.5} flexWrap="wrap">
        <Typography fontSize={28} fontWeight={700} lineHeight={1.15} letterSpacing={-0.5} sx={{ color: tom === "primary" ? "text.primary" : cor }}>
          {valor}
        </Typography>
        {destaque && (
          <Box component="span" sx={{ fontSize: 12, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: 1.5, bgcolor: alpha(cor, 0.12), color: cor }}>
            {destaque}
          </Box>
        )}
        {complemento && (
          <Typography component="span" variant="body2" fontWeight={600} sx={{ color: corComplemento }}>
            {complemento.texto}
          </Typography>
        )}
      </Stack>
      {apoio && (
        <Typography
          variant="caption"
          mt={0.5}
          title={apoio}
          sx={{ color: CORES_DASHBOARD.textoApagado, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {apoio}
        </Typography>
      )}
    </Paper>
  );
}
