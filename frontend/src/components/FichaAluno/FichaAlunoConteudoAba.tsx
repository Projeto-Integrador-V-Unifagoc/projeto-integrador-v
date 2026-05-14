import { Paper, Typography, Stack } from "@mui/material";

interface FichaAlunoConteudoAbaProps {
  titulo: string;
}

export function FichaAlunoConteudoAba({
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
        <Typography variant="body1" color="text.secondary">
          Conteudo mockado para a aba "{titulo}".
        </Typography>
      </Stack>
    </Paper>
  );
}
