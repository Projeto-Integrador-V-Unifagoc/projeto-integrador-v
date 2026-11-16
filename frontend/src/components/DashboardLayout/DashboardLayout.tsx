import type { ReactNode } from "react";
import { Box, Skeleton, Stack } from "@mui/material";
import Container from "../Container";
import AssistenteIaCaixa from "./AssistenteIaCaixa";
import DashboardCabecalho from "./DashboardCabecalho";
import DashboardRodape from "./DashboardRodape";
import IndicadorCard from "./IndicadorCard";
import { CORES_DASHBOARD } from "./dashboard-estilos";
import type { IndicadorDashboard } from "./IndicadorCard";

export interface DashboardLayoutProps {
  nome: string;
  /** Resumo acionável abaixo da saudação (o que precisa de atenção agora). */
  contexto: ReactNode;
  /** Selo opcional ao lado da saudação. */
  seloNome?: string;
  /** Texto opcional na linha da data (ex.: "Período 2026.1"). */
  seloData?: string;
  /** Caixa do assistente de IA. Padrão: caixa visual sem envio. */
  assistente?: ReactNode;
  /** Conteúdo específico do perfil abaixo da saudação (ex.: filtros do professor). */
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

/** Largura útil a partir da qual os painéis ficam lado a lado (medida no container, não na janela). */
const LARGURA_DUAS_COLUNAS = 880;
const DUAS_COLUNAS = `@container dashboard (min-width: ${LARGURA_DUAS_COLUNAS}px)`;

// KPIs: 4, 2 ou 1 coluna conforme a área útil, sem depender da largura da sidebar.
const sxGradeIndicadores = { display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" } as const;
// Painéis lado a lado com área útil ≥ 880 px; abaixo disso, empilhados.
// 1ª linha 2fr/1fr: o painel principal é uma tabela (nome, média, frequência, ações) e precisa de largura
// para o nome não ser cortado. 2ª linha 7fr/5fr: listas sem colunas, mais equilibradas.
const linhaPaineis = (fracoes: string) => ({ display: "grid", gap: 2, gridTemplateColumns: "minmax(0, 1fr)", alignItems: "stretch", [DUAS_COLUNAS]: { gridTemplateColumns: fracoes } }) as const;
const sxLinhaPaineis = linhaPaineis("minmax(0, 2fr) minmax(0, 1fr)");
const sxSegundaLinhaPaineis = linhaPaineis("minmax(0, 7fr) minmax(0, 5fr)");

function EsqueletoCarregando() {
  return (
    <Stack gap={2} aria-label="Carregando dashboard" aria-busy="true">
      <Skeleton variant="rounded" height={84} />
      <Box sx={sxGradeIndicadores}>
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={100} />)}
      </Box>
      {[0, 1].map((linha) => (
        <Box key={linha} sx={sxLinhaPaineis}>
          <Skeleton variant="rounded" height={300} />
          <Skeleton variant="rounded" height={300} />
        </Box>
      ))}
    </Stack>
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
    // Página branca como as demais telas (padrão do Organograma); a profundidade vem dos cartões.
    // disableGutters: o <main> já dá 24 px de margem; sem isso o MUI somava mais 24 px de cada lado.
    <Container disableGutters sx={{ p: 0, pb: 3, border: 0, overflowY: "auto", color: CORES_DASHBOARD.texto }}>
      {/* Limite só para monitores ultralargos (2560+): em telas de até 1920 px o layout ocupa toda a área útil. */}
      <Box sx={{ maxWidth: 1600, mx: "auto", containerType: "inline-size", containerName: "dashboard" }}>
        {carregando ? (
          <EsqueletoCarregando />
        ) : (
          <Stack gap={2}>
            <DashboardCabecalho
              nome={nome}
              seloNome={seloNome}
              seloData={seloData}
              contexto={contexto}
              extras={extrasCabecalho}
              assistente={assistente ?? <AssistenteIaCaixa />}
              duasColunas={DUAS_COLUNAS}
            />

            {avisos && <Stack gap={1.5}>{avisos}</Stack>}

            <Box component="section" aria-label="Indicadores" sx={sxGradeIndicadores}>
              {indicadores.slice(0, 4).map(({ id, ...indicador }) => (
                <IndicadorCard key={id} {...indicador} />
              ))}
            </Box>

            <Box sx={sxLinhaPaineis}>
              {painelPrincipal}
              {painelComplementar}
            </Box>
            <Box sx={sxSegundaLinhaPaineis}>
              {painelEvolucao}
              {painelAcoes}
            </Box>

            {rodape ?? <DashboardRodape />}
          </Stack>
        )}
      </Box>
    </Container>
  );
}
