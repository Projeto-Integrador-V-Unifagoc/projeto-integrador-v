import { Filter, Search } from "lucide-react";
import {
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";

import TextField from "../TextField";

interface FichaAlunoHeaderProps {
  busca: string;
  semestre: string;
  opcoesSemestre: string[];
  onBuscaChange: (value: string) => void;
  onSemestreChange: (value: string) => void;
}

export function FichaAlunoHeader(props: FichaAlunoHeaderProps) {
  const {
    busca,
    semestre,
    opcoesSemestre,
    onBuscaChange,
    onSemestreChange,
  } = props;

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
            fullWidth
            placeholder="Digite um RA ou nome do aluno para pesquisar."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small">
                    <Filter size={18} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                backgroundColor: "#fff",
              },
              "& .MuiInputBase-input": {
                fontSize: { xs: 14, md: 16 },
              },
            }}
          />

          <TextField
            select
            value={semestre}
            onChange={(e) => onSemestreChange(e.target.value)}
            sx={{
              minWidth: { xs: "100%", md: 140 },
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
