import type { ReactNode } from "react";
import { Box, Drawer, IconButton, Stack, Typography } from "@mui/material";
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, ESTADOS, PESO, TIPO_DASHBOARD, sxCartaoDashboard, sxIconeQuadrado } from "./dashboard-estilos";
import type { TomEstado } from "./dashboard-estilos";

// Painel lateral de detalhe no mesmo padrão dos dashboards. Usado pelo "Consultar detalhes"
// do aluno (disciplina) e do professor (aluno e turma).

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
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 560 }, maxWidth: "100vw", bgcolor: CORES_DASHBOARD.superficie, color: CORES_DASHBOARD.texto, display: "flex", flexDirection: "column" } } }}
    >
      <Box
        component="header"
        sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: CORES_DASHBOARD.superficie, borderBottom: `1px solid ${CORES_DASHBOARD.borda}`, px: { xs: 2, sm: 3 }, py: 2 }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
          <Stack direction="row" gap={1.5} minWidth={0}>
            <Box aria-hidden="true" sx={sxIconeQuadrado(ESTADOS.acento, 36)}>
              <Icone size={18} />
            </Box>
            <Box minWidth={0}>
              <Typography id="titulo-painel-detalhe" component="h2" sx={{ fontSize: 18, fontWeight: PESO.forte, lineHeight: 1.3, overflowWrap: "anywhere" }}>
                {titulo}
              </Typography>
              {subtitulo && <Typography sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoSuave }}>{subtitulo}</Typography>}
              {contexto && <Typography sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado, mt: 0.25 }}>{contexto}</Typography>}
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5} flexShrink={0}>
            {selo}
            <IconButton aria-label={rotuloFechar} onClick={onFechar} size="small" sx={{ color: CORES_DASHBOARD.textoSuave }}>
              <X size={18} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Stack gap={2.5} sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: "auto" }}>{children}</Stack>

      {acoes && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          gap={1}
          sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: `1px solid ${CORES_DASHBOARD.borda}`, bgcolor: CORES_DASHBOARD.superficie, "& > *": { width: { xs: "100%", sm: "auto" } } }}
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
        <Typography component="h3" sx={{ fontSize: TIPO_DASHBOARD.painel, fontWeight: PESO.forte }}>{titulo}</Typography>
        {extra}
      </Stack>
      {children}
    </Box>
  );
}

export function MetricaDetalhe({ titulo, valor, apoio, cor }: { titulo: string; valor: string; apoio?: string; cor?: string }) {
  return (
    <Box sx={{ ...sxCartaoDashboard, p: 1.5, height: "100%" }}>
      <Typography sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoSuave }}>{titulo}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: PESO.forte, lineHeight: 1.3, mt: 0.25, color: cor ?? CORES_DASHBOARD.texto }}>{valor}</Typography>
      {apoio && <Typography sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>{apoio}</Typography>}
    </Box>
  );
}

export type GravidadeAviso = "alta" | "media" | "info" | "ok";

const ICONE_AVISO: Record<GravidadeAviso, LucideIcon> = { alta: AlertTriangle, media: CircleAlert, info: Info, ok: CheckCircle2 };
const TOM_AVISO: Record<GravidadeAviso, TomEstado> = { alta: "critico", media: "atencao", info: "neutro", ok: "ok" };

/** Aviso discreto: fundo claro do estado, ícone e título no tom escuro. */
export function AvisoDetalhe({ gravidade, titulo, children }: { gravidade: GravidadeAviso; titulo?: string; children: ReactNode }) {
  const cores = ESTADOS[TOM_AVISO[gravidade]];
  const Icone = ICONE_AVISO[gravidade];
  return (
    <Box role={gravidade === "alta" ? "alert" : undefined} sx={{ display: "flex", gap: 1.25, p: 1.5, borderRadius: 2, bgcolor: cores.fundo }}>
      <Box aria-hidden="true" sx={{ color: cores.texto, pt: 0.1, flexShrink: 0 }}><Icone size={17} /></Box>
      <Box minWidth={0}>
        {titulo && <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte, color: cores.texto }}>{titulo}</Typography>}
        <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo, color: CORES_DASHBOARD.textoSuave }}>{children}</Typography>
      </Box>
    </Box>
  );
}
