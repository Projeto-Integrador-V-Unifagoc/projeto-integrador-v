import type { ReactNode } from "react";
import { Box, Drawer, IconButton, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, sxCartaoDashboard } from "./dashboard-estilos";

// Painel lateral de detalhe no mesmo visual dos dashboards (cabeçalho branco, cartões com borda,
// avisos discretos). Usado pelo "Consultar detalhes" do aluno (disciplina) e do professor (aluno).

export interface PainelDetalheProps {
  aberto: boolean;
  onFechar: () => void;
  icone: LucideIcon;
  titulo: string;
  subtitulo?: string;
  /** Linha de contexto abaixo do subtítulo (ex.: professor e carga horária). */
  contexto?: string;
  /** Selo no canto do cabeçalho (ex.: SeloRisco). */
  selo?: ReactNode;
  rotuloFechar?: string;
  /** Botões fixos no rodapé do painel. */
  acoes?: ReactNode;
  children: ReactNode;
}

export default function PainelDetalhe({ aberto, onFechar, icone: Icone, titulo, subtitulo, contexto, selo, rotuloFechar = "Fechar detalhes", acoes, children }: PainelDetalheProps) {
  return (
    <Drawer
      anchor="right"
      open={aberto}
      onClose={onFechar}
      aria-labelledby="titulo-painel-detalhe"
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 600 }, maxWidth: "100vw", bgcolor: CORES_DASHBOARD.superficie, display: "flex", flexDirection: "column" } } }}
    >
      <Box
        component="header"
        sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: CORES_DASHBOARD.superficie, borderBottom: `1px solid ${CORES_DASHBOARD.borda}`, px: { xs: 2, sm: 3 }, py: 2 }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
          <Stack direction="row" gap={1.5} minWidth={0}>
            <Box aria-hidden="true" sx={{ width: 42, height: 42, borderRadius: 2, flexShrink: 0, display: "grid", placeItems: "center", bgcolor: "#E6F6FB", color: CORES_DASHBOARD.acento }}>
              <Icone size={21} />
            </Box>
            <Box minWidth={0}>
              <Typography id="titulo-painel-detalhe" component="h2" fontWeight={700} fontSize={19} lineHeight={1.3} sx={{ overflowWrap: "anywhere" }}>
                {titulo}
              </Typography>
              {subtitulo && <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoSuave }}>{subtitulo}</Typography>}
              {contexto && <Typography variant="caption" display="block" sx={{ color: CORES_DASHBOARD.textoApagado, mt: 0.25 }}>{contexto}</Typography>}
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5} flexShrink={0}>
            {selo}
            <IconButton aria-label={rotuloFechar} onClick={onFechar} size="small" sx={{ color: CORES_DASHBOARD.textoSuave }}>
              <X size={20} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Stack gap={2.5} sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: "auto" }}>{children}</Stack>

      {acoes && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          gap={1.25}
          sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: `1px solid ${CORES_DASHBOARD.borda}`, bgcolor: CORES_DASHBOARD.superficie, "& > button": { width: { xs: "100%", sm: "auto" }, height: 36, whiteSpace: "nowrap" } }}
        >
          {acoes}
        </Stack>
      )}
    </Drawer>
  );
}

export function SecaoDetalhe({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Box component="section" aria-label={titulo}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} mb={1}>
        <Typography component="h3" fontWeight={700} fontSize={15}>{titulo}</Typography>
        {extra}
      </Stack>
      {children}
    </Box>
  );
}

export function MetricaDetalhe({ titulo, valor, apoio, cor }: { titulo: string; valor: string; apoio?: string; cor?: string }) {
  return (
    <Box sx={{ ...sxCartaoDashboard, p: 1.5, height: "100%" }}>
      <Typography variant="caption" fontWeight={600} sx={{ color: CORES_DASHBOARD.textoSuave }}>{titulo}</Typography>
      <Typography fontSize={22} fontWeight={700} lineHeight={1.25} mt={0.25} sx={{ color: cor ?? "text.primary" }}>{valor}</Typography>
      {apoio && <Typography variant="caption" display="block" sx={{ color: CORES_DASHBOARD.textoApagado }}>{apoio}</Typography>}
    </Box>
  );
}

export type GravidadeAviso = "alta" | "media" | "info" | "ok";

const ICONE_AVISO: Record<GravidadeAviso, LucideIcon> = { alta: AlertTriangle, media: CircleAlert, info: Info, ok: CheckCircle2 };
const PALETA_AVISO: Record<GravidadeAviso, "error" | "warning" | "info" | "success"> = { alta: "error", media: "warning", info: "info", ok: "success" };

/** Aviso discreto (borda + ícone colorido), no estilo dos "Pontos de atenção" do dashboard. */
export function AvisoDetalhe({ gravidade, titulo, children }: { gravidade: GravidadeAviso; titulo?: string; children: ReactNode }) {
  const theme = useTheme();
  const paleta = theme.palette[PALETA_AVISO[gravidade]];
  const Icone = ICONE_AVISO[gravidade];
  return (
    <Box
      role={gravidade === "alta" ? "alert" : undefined}
      sx={{ display: "flex", gap: 1.25, p: 1.5, borderRadius: 2, border: `1px solid ${alpha(paleta.main, 0.35)}`, bgcolor: alpha(paleta.main, 0.05) }}
    >
      <Box aria-hidden="true" sx={{ color: paleta.main, pt: 0.1, flexShrink: 0 }}><Icone size={18} /></Box>
      <Box minWidth={0}>
        {titulo && <Typography variant="body2" fontWeight={700} sx={{ color: paleta.dark }}>{titulo}</Typography>}
        <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoSuave }}>{children}</Typography>
      </Box>
    </Box>
  );
}
