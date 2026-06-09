import type { ReactNode } from "react";
import { Paper, Typography, Stack } from "@mui/material";

interface FichaAlunoConteudoAbaProps {
  titulo: string;
  children?: ReactNode;
  descricao?: string;
}

export function FichaAlunoConteudoAba({
  children,
  descricao,
  titulo,
}: FichaAlunoConteudoAbaProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: (theme) => `1px dashed ${theme.palette.divider}`,
        borderRadius: 3,
        p: 4,
        textAlign: "center",
      }}
    >
      <Stack spacing={1}>
        {children ?? (
          <Typography variant="body1" color="text.secondary">
            {descricao ?? `A aba "${titulo}" ainda nao possui endpoint disponivel.`}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
