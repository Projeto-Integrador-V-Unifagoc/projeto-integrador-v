import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, ESTADOS, PESO, TIPO_DASHBOARD, sxIconeQuadrado } from "./dashboard-estilos";

export interface PaginaCabecalhoProps {
  titulo: string;
  /** Uma linha dizendo o que a página mostra. */
  subtitulo?: ReactNode;
  icone?: LucideIcon;
  /** Ações ou filtros à direita (empilham no celular). */
  acoes?: ReactNode;
}

/**
 * Cabeçalho das páginas internas: h1 24/700 (o mesmo título h5 das demais páginas do sistema; só a
 * saudação do dashboard é maior), subtítulo de 13 px e ações à direita.
 */
export default function PaginaCabecalho({ titulo, subtitulo, icone: Icone, acoes }: PaginaCabecalhoProps) {
  return (
    <Stack component="header" direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1.5}>
      <Stack direction="row" alignItems="center" gap={1.5} minWidth={0}>
        {Icone && (
          <Box aria-hidden="true" sx={sxIconeQuadrado(ESTADOS.neutro, 36)}>
            <Icone size={18} />
          </Box>
        )}
        <Box minWidth={0}>
          <Typography component="h1" sx={{ fontSize: TIPO_DASHBOARD.valorKpi, fontWeight: PESO.forte, lineHeight: 1.25, overflowWrap: "anywhere" }}>
            {titulo}
          </Typography>
          {subtitulo && (
            <Typography sx={{ mt: 0.25, fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoSuave }}>
              {subtitulo}
            </Typography>
          )}
        </Box>
      </Stack>
      {acoes && (
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ width: { xs: "100%", sm: "auto" } }}>
          {acoes}
        </Stack>
      )}
    </Stack>
  );
}
