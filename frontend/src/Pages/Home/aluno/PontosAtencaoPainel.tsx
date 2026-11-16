import { Box, Button, Stack, Typography } from "@mui/material";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CORES_DASHBOARD,
  DashboardPainel,
  ESTADOS,
  LinhaPainel,
  ListaPainel,
  PESO,
  TIPO_DASHBOARD,
  sxBotaoSecundario,
  sxIconeQuadrado,
  sxSelo,
} from "../../../components/DashboardLayout";
import type { TomEstado } from "../../../components/DashboardLayout";
import { MAX_PONTOS_ATENCAO } from "./regras-dashboard-aluno";
import type { GravidadePonto, PontoAtencao } from "./regras-dashboard-aluno";

const VISUAL: Record<GravidadePonto, { icone: LucideIcon; tom: TomEstado }> = {
  alta: { icone: AlertTriangle, tom: "critico" },
  media: { icone: CircleAlert, tom: "atencao" },
  info: { icone: Info, tom: "neutro" },
};

interface PontosAtencaoPainelProps {
  pontos: PontoAtencao[];
  onVerDetalhes: (turmaDisciplinaId: string) => void;
}

export default function PontosAtencaoPainel({ pontos, onVerDetalhes }: PontosAtencaoPainelProps) {
  const visiveis = pontos.slice(0, MAX_PONTOS_ATENCAO);
  return (
    <DashboardPainel
      titulo="Pontos de atenção"
      contador={pontos.length || undefined}
      subtitulo={pontos.length > MAX_PONTOS_ATENCAO ? `${MAX_PONTOS_ATENCAO} mais graves` : undefined}
      semPadding
    >
      {visiveis.length ? (
        <ListaPainel rotulo="Pontos de atenção">
          {visiveis.map((ponto) => {
            const { icone: Icone, tom } = VISUAL[ponto.gravidade];
            return (
              <LinhaPainel key={ponto.id} rotulo={ponto.titulo}>
                <Box aria-hidden="true" sx={sxIconeQuadrado(ESTADOS[tom])}>
                  <Icone size={15} />
                </Box>
                {/* Uma linha de título e uma de meta (selo + descrição), como as demais listas; o texto completo fica no tooltip. */}
                <Box flex={1} minWidth={0}>
                  <Typography noWrap title={ponto.titulo} sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>{ponto.titulo}</Typography>
                  <Stack direction="row" gap={1} alignItems="center" mt={0.25} minWidth={0}>
                    <Box component="span" sx={sxSelo(tom)}>{ponto.selo}</Box>
                    <Typography noWrap title={ponto.descricao} sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
                      {ponto.descricao}
                    </Typography>
                  </Stack>
                </Box>
                <Button size="small" onClick={() => onVerDetalhes(ponto.turmaDisciplinaId)} sx={sxBotaoSecundario}>
                  Ver detalhes
                </Button>
              </LinhaPainel>
            );
          })}
        </ListaPainel>
      ) : (
        <Stack minHeight={150} alignItems="center" justifyContent="center" textAlign="center" gap={0.75} px={2}>
          <CheckCircle2 size={24} color={ESTADOS.ok.ponto} aria-hidden="true" />
          <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>Nenhum ponto de atenção</Typography>
          <Typography sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoApagado }}>Frequência, médias e prazos dentro das referências.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
