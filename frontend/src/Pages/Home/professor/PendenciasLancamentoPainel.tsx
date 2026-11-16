import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CalendarCheck, CheckCircle2, ClipboardPen } from "lucide-react";
import { CORES_DASHBOARD, DashboardPainel } from "../../../components/DashboardLayout";
import { formatarDataPtBr } from "../../../utils/avaliacao";
import type { PendenciaLancamento } from "./regras-dashboard-professor";

const VISIVEIS = 5;

interface PendenciasLancamentoPainelProps {
  pendencias: PendenciaLancamento[];
  onLancarNotas: () => void;
  onRegistrarPresenca: () => void;
}

export default function PendenciasLancamentoPainel({ pendencias, onLancarNotas, onRegistrarPresenca }: PendenciasLancamentoPainelProps) {
  const theme = useTheme();
  const visiveis = pendencias.slice(0, VISIVEIS);

  return (
    <DashboardPainel
      titulo="Pendências de lançamento"
      contador={pendencias.length || undefined}
      subtitulo={pendencias.length > VISIVEIS ? `${VISIVEIS} mais urgentes` : undefined}
      acao={{ rotulo: "Ir para lançamentos", onClick: onLancarNotas }}
    >
      {visiveis.length ? (
        <Stack gap={1.25}>
          {visiveis.map((item) => {
            const ehChamada = item.tipo === "chamada";
            const Icone = ehChamada ? CalendarCheck : ClipboardPen;
            const corBarra = item.vencida ? theme.palette.warning.main : ehChamada ? theme.palette.info.main : CORES_DASHBOARD.marca;
            const titulo = ehChamada ? `Chamada de ${formatarDataPtBr(item.data).slice(0, 5)}` : item.titulo;
            const detalhe = ehChamada
              ? `Faltam ${item.faltantes} de ${item.esperados} registros`
              : `Faltam ${item.faltantes} de ${item.esperados} notas${item.data ? ` · devolução ${formatarDataPtBr(item.data).slice(0, 5)}` : ""}`;
            return (
              <Box
                key={item.id}
                component="article"
                aria-label={`${titulo} — ${item.disciplinaNome}`}
                sx={{ p: 1.75, borderRadius: 2, border: `1px solid ${item.vencida ? "#F2D48A" : CORES_DASHBOARD.borda}`, display: "flex", gap: 1.5, alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" } }}
              >
                <Stack direction="row" gap={1.5} flex={1} minWidth={0} width="100%">
                  <Box aria-hidden="true" sx={{ width: 36, height: 36, borderRadius: 2, flexShrink: 0, display: "grid", placeItems: "center", bgcolor: ehChamada ? "#FFF4DE" : "#E6F6FB", color: ehChamada ? theme.palette.warning.dark : CORES_DASHBOARD.acento }}>
                    <Icone size={18} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body2" fontWeight={700}>{titulo}</Typography>
                      <Box component="span" sx={{ fontSize: 12, px: 0.75, py: 0.2, borderRadius: 1.5, border: `1px solid ${CORES_DASHBOARD.borda}`, color: CORES_DASHBOARD.textoSuave, whiteSpace: "nowrap" }}>
                        {item.turmaSigla} • {item.disciplinaNome}
                      </Box>
                      {item.vencida && (
                        <Box component="span" sx={{ fontSize: 12, fontWeight: 700, px: 0.75, py: 0.2, borderRadius: 1.5, bgcolor: "#FFF4DE", color: theme.palette.warning.dark }}>Devolução passou</Box>
                      )}
                    </Stack>
                    <Typography variant="body2" mt={0.25} sx={{ color: CORES_DASHBOARD.textoSuave }}>{detalhe}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={item.esperados ? (item.feitos / item.esperados) * 100 : 0}
                      aria-label={`Progresso: ${item.feitos} de ${item.esperados}`}
                      sx={{ mt: 1, maxWidth: 320, height: 6, borderRadius: 9, bgcolor: "#EEF2F6", "& .MuiLinearProgress-bar": { bgcolor: corBarra, borderRadius: 9 } }}
                    />
                  </Box>
                </Stack>
                <Button
                  variant={ehChamada ? "outlined" : "contained"}
                  size="small"
                  onClick={ehChamada ? onRegistrarPresenca : onLancarNotas}
                  disableElevation
                  sx={{
                    width: "auto",
                    height: 34,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    alignSelf: { xs: "flex-end", sm: "center" },
                    ...(ehChamada
                      ? { borderColor: CORES_DASHBOARD.borda, color: "text.primary" }
                      : { bgcolor: CORES_DASHBOARD.acento, color: "#fff", "&:hover": { bgcolor: CORES_DASHBOARD.acentoHover } }),
                  }}
                >
                  {ehChamada ? "Registrar presença" : "Lançar notas"}
                </Button>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Stack minHeight={150} alignItems="center" justifyContent="center" textAlign="center" gap={1}>
          <CheckCircle2 size={30} color={theme.palette.success.main} aria-hidden="true" />
          <Typography fontWeight={700}>Nenhuma pendência de lançamento</Typography>
          <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoApagado }}>Notas e chamadas em dia.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
