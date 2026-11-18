import type { ReactNode } from "react";
import { Box, Stack } from "@mui/material";
import Container from "../Container";
import { sxConteudoPagina, sxPaginaPadrao } from "./dashboard-estilos";

/**
 * Moldura das páginas internas no padrão dos dashboards: fundo branco, sem a margem lateral duplicada
 * do Container do MUI (o <main> já dá 24 px), blocos com 16 px de espaço e largura máxima de 1600 px.
 */
export default function PaginaPadrao({ children }: { children: ReactNode }) {
  return (
    <Container disableGutters sx={sxPaginaPadrao}>
      <Box sx={sxConteudoPagina}>
        <Stack gap={2}>{children}</Stack>
      </Box>
    </Container>
  );
}
