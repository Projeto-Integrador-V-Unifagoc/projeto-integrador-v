import { MenuItem, Stack, Typography } from "@mui/material";

import TextField from "../TextField";

interface FichaAlunoHeaderProps {
  semestre: string;
  opcoesSemestre: string[];
  onSemestreChange: (value: string) => void;
}

export function FichaAlunoHeader(props: FichaAlunoHeaderProps) {
  const { semestre, opcoesSemestre, onSemestreChange } = props;

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Typography variant="h6" fontWeight={700} color="primary">
          Painel do Aluno
        </Typography>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            select
            value={semestre}
            onChange={(e) => onSemestreChange(e.target.value)}
            sx={{
              minWidth: { xs: "100%", md: 240 },
              "& .MuiInputBase-input": {
                fontSize: { xs: 14, md: 16 },
              },
            }}
          >
            {opcoesSemestre.length === 0 ? (
              <MenuItem value="">Sem periodos</MenuItem>
            ) : (
              opcoesSemestre.map((opcao) => (
                <MenuItem key={opcao} value={opcao}>
                  {opcao}
                </MenuItem>
              ))
            )}
          </TextField>
        </Stack>
      </Stack>
    </Stack>
  );
}
