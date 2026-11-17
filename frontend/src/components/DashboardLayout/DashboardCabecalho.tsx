import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { CalendarDays } from "lucide-react";
import { CORES_DASHBOARD, PESO, TIPO_DASHBOARD, sxSelo } from "./dashboard-estilos";

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
  /** Texto na linha da data (ex.: "Período 2026.1"). */
  seloData?: string;
  data?: Date;
  /** Container query a partir da qual saudação e IA ficam lado a lado. */
  duasColunas?: string;
}

export default function DashboardCabecalho({ nome, contexto, assistente, extras, seloNome, seloData, data = new Date(), duasColunas = "@media (min-width: 900px)" }: DashboardCabecalhoProps) {
  return (
    <Box
      component="header"
      sx={{ display: "grid", gap: 2, alignItems: "center", gridTemplateColumns: "minmax(0, 1fr)", [duasColunas]: { gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", gap: 3 } }}
    >
      <Box minWidth={0}>
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ color: CORES_DASHBOARD.textoApagado }}>
          <CalendarDays size={14} aria-hidden="true" />
          <Typography component="span" sx={{ fontSize: TIPO_DASHBOARD.legenda }}>
            {dataPorExtenso(data)}
            {seloData && ` · ${seloData}`}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
          {/* 28 px/700 (24 px no celular): acima dos números dos KPIs, para a saudação ser o primeiro ponto de leitura. */}
          <Typography component="h1" sx={{ fontSize: { xs: TIPO_DASHBOARD.valorKpi, sm: TIPO_DASHBOARD.saudacao }, fontWeight: PESO.forte, lineHeight: 1.25, letterSpacing: -0.3, overflowWrap: "anywhere" }}>
            Olá, {nome}!
          </Typography>
          {seloNome && <Box component="span" sx={sxSelo("neutro")}>{seloNome}</Box>}
        </Stack>
        <Typography mt={0.25} sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoSuave }}>
          {contexto}
        </Typography>
        {extras && <Box mt={1.5}>{extras}</Box>}
      </Box>
      <Box minWidth={0}>{assistente}</Box>
    </Box>
  );
}
