import type { ReactNode } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, sxCartaoDashboard } from "./dashboard-estilos";

export interface AcaoPainel {
  rotulo: string;
  onClick: () => void;
}

export interface DashboardPainelProps {
  titulo: string;
  subtitulo?: string;
  contador?: number | string;
  acao?: AcaoPainel;
  /** Controles livres no lado direito do cabeçalho (ex.: alternador de visão). */
  extra?: ReactNode;
  icone?: LucideIcon;
  children: ReactNode;
}

export default function DashboardPainel({ titulo, subtitulo, contador, acao, extra, icone: Icone, children }: DashboardPainelProps) {
  return (
    <Paper component="section" aria-label={titulo} sx={{ ...sxCartaoDashboard, height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
        flexWrap="wrap"
        sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 1.5, borderBottom: `1px solid ${CORES_DASHBOARD.borda}` }}
      >
        <Box minWidth={0}>
          <Stack direction="row" alignItems="center" gap={1}>
            {Icone && <Icone size={18} color={CORES_DASHBOARD.acento} aria-hidden="true" style={{ flexShrink: 0 }} />}
            <Typography component="h2" variant="h6" fontWeight={700} fontSize={17} noWrap>
              {titulo}
            </Typography>
            {contador !== undefined && (
              <Box component="span" sx={{ fontSize: 12, fontWeight: 700, px: 1, py: 0.25, borderRadius: 5, bgcolor: CORES_DASHBOARD.acentoSuave, color: CORES_DASHBOARD.acento, flexShrink: 0 }}>
                {contador}
              </Box>
            )}
          </Stack>
          {subtitulo && (
            <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoApagado }}>
              {subtitulo}
            </Typography>
          )}
        </Box>
        {extra}
        {acao && (
          <Button
            size="small"
            onClick={acao.onClick}
            endIcon={<ChevronRight size={15} />}
            sx={{ width: "auto", height: 30, flexShrink: 0, color: CORES_DASHBOARD.acento, whiteSpace: "nowrap" }}
          >
            {acao.rotulo}
          </Button>
        )}
      </Stack>
      <Box sx={{ p: { xs: 2, md: 2.5 }, flex: 1, display: "flex", flexDirection: "column" }}>{children}</Box>
    </Paper>
  );
}
