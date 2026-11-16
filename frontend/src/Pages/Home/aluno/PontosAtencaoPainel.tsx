import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import { CORES_DASHBOARD, DashboardPainel } from "../../../components/DashboardLayout";
import { MAX_PONTOS_ATENCAO } from "./regras-dashboard-aluno";
import type { GravidadePonto, PontoAtencao } from "./regras-dashboard-aluno";

const VISUAL: Record<GravidadePonto, { icone: typeof Info; cor: "error" | "warning" | "info" }> = {
  alta: { icone: AlertTriangle, cor: "error" },
  media: { icone: CircleAlert, cor: "warning" },
  info: { icone: Info, cor: "info" },
};

interface PontosAtencaoPainelProps {
  pontos: PontoAtencao[];
  onVerDetalhes: (turmaDisciplinaId: string) => void;
}

export default function PontosAtencaoPainel({ pontos, onVerDetalhes }: PontosAtencaoPainelProps) {
  const theme = useTheme();
  const visiveis = pontos.slice(0, MAX_PONTOS_ATENCAO);
  return (
    <DashboardPainel
      titulo="Pontos de atenção acadêmica"
      contador={pontos.length || undefined}
      subtitulo={pontos.length > MAX_PONTOS_ATENCAO ? `Conforme o Regimento · ${MAX_PONTOS_ATENCAO} mais graves` : "Conforme o Regimento"}
    >
      {visiveis.length ? (
        <Stack gap={1.25}>
          {visiveis.map((ponto) => {
            const { icone: Icone, cor } = VISUAL[ponto.gravidade];
            const paleta = theme.palette[cor];
            return (
              <Box
                key={ponto.id}
                component="article"
                aria-label={ponto.titulo}
                sx={{ p: 1.75, borderRadius: 2, border: `1px solid ${CORES_DASHBOARD.borda}`, display: "flex", gap: 1.5, alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" } }}
              >
                <Stack direction="row" gap={1.5} flex={1} minWidth={0}>
                  <Box aria-hidden="true" sx={{ color: paleta.main, pt: 0.25, flexShrink: 0 }}><Icone size={19} /></Box>
                  <Box minWidth={0}>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body2" fontWeight={700}>{ponto.titulo}</Typography>
                      <Box component="span" sx={{ fontSize: 12, fontWeight: 700, px: 0.75, py: 0.2, borderRadius: 1.5, bgcolor: alpha(paleta.main, 0.12), color: paleta.dark, whiteSpace: "nowrap" }}>
                        {ponto.selo}
                      </Box>
                    </Stack>
                    <Typography variant="body2" mt={0.5} sx={{ color: CORES_DASHBOARD.textoSuave }}>{ponto.descricao}</Typography>
                  </Box>
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onVerDetalhes(ponto.turmaDisciplinaId)}
                  sx={{ width: "auto", height: 32, flexShrink: 0, whiteSpace: "nowrap", borderColor: CORES_DASHBOARD.borda, color: "text.primary", alignSelf: { xs: "flex-end", sm: "center" } }}
                >
                  Ver detalhes
                </Button>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Stack minHeight={150} alignItems="center" justifyContent="center" textAlign="center" gap={1}>
          <CheckCircle2 size={30} color={theme.palette.success.main} aria-hidden="true" />
          <Typography fontWeight={700}>Nenhum ponto de atenção</Typography>
          <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoApagado }}>Frequência, médias e prazos dentro das referências.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
