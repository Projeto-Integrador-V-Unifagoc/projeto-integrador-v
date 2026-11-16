import type { ReactNode } from "react";
import { Grid, Skeleton, Stack } from "@mui/material";
import Container from "../Container";
import AssistenteIaCaixa from "./AssistenteIaCaixa";
import DashboardCabecalho from "./DashboardCabecalho";
import DashboardRodape from "./DashboardRodape";
import IndicadorCard from "./IndicadorCard";
import type { IndicadorDashboard } from "./IndicadorCard";

export interface DashboardLayoutProps {
  nome: string;
  contexto: ReactNode;
  /** Selo opcional ao lado da saudação. */
  seloNome?: string;
  /** Selo opcional na linha da data. */
  seloData?: string;
  /** Caixa do assistente de IA. Padrão: caixa visual sem envio. */
  assistente?: ReactNode;
  /** Conteúdo específico do perfil abaixo da saudação (ex.: seletor de período do professor). */
  extrasCabecalho?: ReactNode;
  /** Alertas exibidos entre o cabeçalho e os indicadores. */
  avisos?: ReactNode;
  /** Até 4 indicadores. */
  indicadores: IndicadorDashboard[];
  painelPrincipal: ReactNode;
  painelComplementar: ReactNode;
  painelEvolucao: ReactNode;
  painelAcoes: ReactNode;
  rodape?: ReactNode;
  carregando?: boolean;
}

function EsqueletoCarregando() {
  return (
    <Stack gap={3} aria-label="Carregando dashboard" aria-busy="true">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rounded" height={110} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rounded" height={90} /></Grid>
      </Grid>
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((item) => (
          <Grid key={item} size={{ xs: 12, sm: 6, lg: 3 }}><Skeleton variant="rounded" height={118} /></Grid>
        ))}
      </Grid>
      {[0, 1].map((linha) => (
        <Grid key={linha} container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 8 }}><Skeleton variant="rounded" height={280} /></Grid>
          <Grid size={{ xs: 12, lg: 4 }}><Skeleton variant="rounded" height={280} /></Grid>
        </Grid>
      ))}
    </Stack>
  );
}

function LinhaPaineis({ principal, lateral }: { principal: ReactNode; lateral: ReactNode }) {
  return (
    <Grid container spacing={2.5} alignItems="stretch">
      <Grid size={{ xs: 12, lg: 8 }}>{principal}</Grid>
      <Grid size={{ xs: 12, lg: 4 }}>{lateral}</Grid>
    </Grid>
  );
}

export default function DashboardLayout({
  nome,
  contexto,
  seloNome,
  seloData,
  assistente,
  extrasCabecalho,
  avisos,
  indicadores,
  painelPrincipal,
  painelComplementar,
  painelEvolucao,
  painelAcoes,
  rodape,
  carregando = false,
}: DashboardLayoutProps) {
  return (
    <Container sx={{ p: 0, pb: 3, border: 0, overflowY: "auto" }}>
      {carregando ? (
        <EsqueletoCarregando />
      ) : (
        <Stack gap={3}>
          <DashboardCabecalho
            nome={nome}
            seloNome={seloNome}
            seloData={seloData}
            contexto={contexto}
            extras={extrasCabecalho}
            assistente={assistente ?? <AssistenteIaCaixa />}
          />

          {avisos && <Stack gap={1.5}>{avisos}</Stack>}

          <Grid container spacing={2} component="section" aria-label="Indicadores">
            {indicadores.slice(0, 4).map(({ id, ...indicador }) => (
              <Grid key={id} size={{ xs: 12, sm: 6, lg: 3 }}>
                <IndicadorCard {...indicador} />
              </Grid>
            ))}
          </Grid>

          <LinhaPaineis principal={painelPrincipal} lateral={painelComplementar} />
          <LinhaPaineis principal={painelEvolucao} lateral={painelAcoes} />

          {rodape ?? <DashboardRodape />}
        </Stack>
      )}
    </Container>
  );
}
