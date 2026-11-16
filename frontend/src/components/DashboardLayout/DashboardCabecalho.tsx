import type { ReactNode } from "react";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { CalendarDays } from "lucide-react";
import { CORES_DASHBOARD } from "./dashboard-estilos";

const formatoData = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

function dataPorExtenso(data: Date) {
  const texto = formatoData.format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface DashboardCabecalhoProps {
  nome: string;
  contexto: ReactNode;
  assistente: ReactNode;
  extras?: ReactNode;
  /** Selo ao lado da saudação (ex.: "Aluno de graduação"). */
  seloNome?: string;
  /** Selo na linha da data (ex.: "Período 2026.1"). */
  seloData?: string;
  data?: Date;
}

export default function DashboardCabecalho({ nome, contexto, assistente, extras, seloNome, seloData, data = new Date() }: DashboardCabecalhoProps) {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" sx={{ color: CORES_DASHBOARD.textoApagado }}>
          <CalendarDays size={15} aria-hidden="true" />
          <Typography variant="body2" component="span">
            {dataPorExtenso(data)}
          </Typography>
          {seloData && (
            <Box component="span" sx={{ ml: 0.5, fontSize: 12, fontWeight: 700, px: 1, py: 0.25, borderRadius: 1.5, bgcolor: CORES_DASHBOARD.acentoSuave, color: CORES_DASHBOARD.acento, whiteSpace: "nowrap" }}>
              {seloData}
            </Box>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" gap={1.25} mt={0.5} flexWrap="wrap">
          <Typography component="h1" fontWeight={700} letterSpacing={-0.6} lineHeight={1.2} sx={{ fontSize: { xs: 26, md: 32 }, overflowWrap: "anywhere" }}>
            Olá, {nome}!
          </Typography>
          {seloNome && (
            <Box component="span" sx={{ fontSize: 12, fontWeight: 700, px: 1.25, py: 0.4, borderRadius: 5, bgcolor: CORES_DASHBOARD.acentoSuave, color: CORES_DASHBOARD.acento, border: `1px solid ${CORES_DASHBOARD.borda}`, whiteSpace: "nowrap" }}>
              {seloNome}
            </Box>
          )}
        </Stack>
        <Typography variant="body1" mt={0.5} sx={{ color: CORES_DASHBOARD.textoSuave }}>
          {contexto}
        </Typography>
        {extras && <Box mt={1.25}>{extras}</Box>}
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>{assistente}</Grid>
    </Grid>
  );
}
