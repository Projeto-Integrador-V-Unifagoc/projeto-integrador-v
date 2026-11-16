import { Box, Paper, Stack, Typography } from "@mui/material";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, ESTADOS, PESO, TIPO_DASHBOARD, sxCartaoDashboard } from "./dashboard-estilos";

/** Só KPIs que pedem ação ganham cor; o resto fica neutro (PADRAO.md, regra 1). */
export type AlertaIndicador = "critico" | "atencao";

export interface IndicadorDashboard {
  id: string;
  titulo: string;
  icone: LucideIcon;
  valor?: string;
  /** Texto curto em cinza ao lado do valor (ex.: "7,7 / 10"). */
  complemento?: string;
  /** Uma linha de apoio abaixo do valor. */
  apoio?: string;
  alerta?: AlertaIndicador;
}

export default function IndicadorCard({ titulo, icone: Icone, valor = "—", complemento, apoio, alerta }: Omit<IndicadorDashboard, "id">) {
  const estado = alerta ? ESTADOS[alerta] : null;
  return (
    <Paper component="article" aria-label={titulo} sx={{ ...sxCartaoDashboard, px: 2, py: 1.75, height: "100%" }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Box
          aria-hidden="true"
          sx={{
            position: "relative",
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: 2,
            border: `1px solid ${CORES_DASHBOARD.borda}`,
            display: "grid",
            placeItems: "center",
            color: CORES_DASHBOARD.textoSuave,
          }}
        >
          <Icone size={15} />
          {estado && (
            <Box sx={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%", bgcolor: estado.ponto, border: `2px solid ${CORES_DASHBOARD.superficie}` }} />
          )}
        </Box>
        <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoSuave }}>
          {titulo}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="baseline" gap={0.75} mt={1}>
        <Typography sx={{ fontSize: TIPO_DASHBOARD.valorKpi, fontWeight: PESO.forte, lineHeight: 1.2, letterSpacing: -0.3, color: estado?.texto ?? CORES_DASHBOARD.texto }}>
          {valor}
        </Typography>
        {complemento && (
          <Typography component="span" noWrap sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoApagado }}>
            {complemento}
          </Typography>
        )}
      </Stack>
      {apoio && (
        <Typography noWrap title={apoio} sx={{ mt: 0.25, fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
          {apoio}
        </Typography>
      )}
    </Paper>
  );
}
