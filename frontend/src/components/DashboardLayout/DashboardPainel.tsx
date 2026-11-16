import type { ReactNode } from "react";
import { Box, Button, ButtonBase, Paper, Stack, Typography } from "@mui/material";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, PESO, TIPO_DASHBOARD, sxBotaoTexto, sxCartaoDashboard, sxSelo } from "./dashboard-estilos";

export interface AcaoPainel {
  rotulo: string;
  onClick: () => void;
}

export interface DashboardPainelProps {
  titulo: string;
  /** Só quando muda a leitura do painel (ex.: "5 mais urgentes"), nunca para explicar a interação. */
  subtitulo?: string;
  contador?: number | string;
  acao?: AcaoPainel;
  /** Controles livres no lado direito do cabeçalho (ex.: alternador de visão). */
  extra?: ReactNode;
  icone?: LucideIcon;
  /** Sem padding interno: para listas cujas linhas vão de borda a borda. */
  semPadding?: boolean;
  /**
   * Altura mínima do conteúdo (px). Para listas que mudam com filtros: reserva o espaço das linhas
   * visíveis e o painel não muda de tamanho quando o filtro traz menos itens.
   */
  alturaMinima?: number;
  children: ReactNode;
}

export default function DashboardPainel({ titulo, subtitulo, contador, acao, extra, icone: Icone, semPadding = false, alturaMinima, children }: DashboardPainelProps) {
  return (
    <Paper component="section" aria-label={titulo} sx={{ ...sxCartaoDashboard, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
        sx={{ minHeight: 48, px: 2, py: 1, borderBottom: `1px solid ${CORES_DASHBOARD.borda}` }}
      >
        <Stack direction="row" alignItems="center" gap={1} minWidth={0}>
          {Icone && <Icone size={16} color={CORES_DASHBOARD.textoSuave} aria-hidden="true" style={{ flexShrink: 0 }} />}
          <Typography component="h2" noWrap sx={{ fontSize: TIPO_DASHBOARD.painel, fontWeight: PESO.forte, lineHeight: 1.4 }}>
            {titulo}
          </Typography>
          {contador !== undefined && <Box component="span" sx={sxSelo("neutro")}>{contador}</Box>}
          {subtitulo && (
            <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
              {subtitulo}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" gap={1} flexShrink={0}>
          {extra}
          {acao && (
            <Button size="small" onClick={acao.onClick} sx={sxBotaoTexto}>
              {acao.rotulo}
            </Button>
          )}
        </Stack>
      </Stack>
      <Box sx={{ ...(semPadding ? {} : { px: 2, py: 1.5 }), minHeight: alturaMinima, flex: 1, display: "flex", flexDirection: "column" }}>{children}</Box>
    </Paper>
  );
}

const sxConteudoLinha = { display: "flex", alignItems: "center", gap: 1.5, width: "100%", minHeight: 52, px: 2, py: 1, textAlign: "left" } as const;

/**
 * Linha de lista do padrão: ≥ 52 px, divisória fina, conteúdo de borda a borda do painel.
 * Com `onClick`, a linha inteira vira um botão (mouse e teclado); não coloque outros botões dentro dela.
 */
export function LinhaPainel({ children, onClick, rotulo }: { children: ReactNode; onClick?: () => void; rotulo?: string }) {
  return (
    <Box component="li" aria-label={onClick ? undefined : rotulo} sx={{ borderBottom: `1px solid ${CORES_DASHBOARD.divisoria}`, "&:last-of-type": { borderBottom: 0 } }}>
      {onClick ? (
        <ButtonBase
          component="div"
          aria-label={rotulo}
          onClick={onClick}
          sx={{ ...sxConteudoLinha, "&:hover": { bgcolor: CORES_DASHBOARD.superficieSutil }, "&.Mui-focusVisible": { outline: `2px solid ${CORES_DASHBOARD.acento}`, outlineOffset: -2 } }}
        >
          {children}
        </ButtonBase>
      ) : (
        <Box sx={sxConteudoLinha}>{children}</Box>
      )}
    </Box>
  );
}

/** Lista sem marcadores para as linhas do painel. */
export function ListaPainel({ children, rotulo }: { children: ReactNode; rotulo?: string }) {
  return (
    <Box component="ul" aria-label={rotulo} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {children}
    </Box>
  );
}
