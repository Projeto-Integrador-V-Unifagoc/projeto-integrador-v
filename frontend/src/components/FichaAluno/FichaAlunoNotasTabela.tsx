import {
  Box,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { GraduationCap } from "lucide-react";

import type { NotaAluno } from "./types";
import { formatarNota } from "./utils";

interface FichaAlunoNotasTabelaProps {
  notas: NotaAluno[];
  semestre: string;
}

export function FichaAlunoNotasTabela(props: FichaAlunoNotasTabelaProps) {
  const { notas, semestre } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
      >
        <Typography variant="h6" fontWeight={700}>
          Notas/Faltas
        </Typography>
        <Stack direction="row" spacing={1} color="text.secondary">
          <GraduationCap size={18} />
          <Typography variant="body2">
            {notas.length} disciplinas no semestre {semestre}
          </Typography>
        </Stack>
      </Stack>

      {notas.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: 3,
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Nenhuma nota ou falta encontrada para o semestre selecionado.
          </Typography>
        </Paper>
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {notas.map((nota) => (
            <Paper
              key={nota.disciplina}
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                p: 2,
              }}
            >
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {nota.disciplina}
                </Typography>

                <Divider />

                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Media Final
                    </Typography>
                    <Typography variant="body2">
                      {formatarNota(nota.mediaFinal)}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">
                      % Faltas
                    </Typography>
                    <Typography variant="body2">
                      {nota.percentualFaltas.toFixed(2).replace(".", ",")}%
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Avaliacoes
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      {formatarNota(nota.avaliacao)}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">
                      Prova Inova
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      {formatarNota(nota.provaInova)}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Segunda Chamada
                    </Typography>
                    <Typography variant="body2">
                      {formatarNota(nota.provaSegundaChamada)}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">
                      Faltas
                    </Typography>
                    <Typography variant="body2">{nota.faltas}</Typography>
                  </Box>
                </Stack>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Conhecimentos Gerais
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    {formatarNota(nota.conhecimentosGerais)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            overflowX: "auto",
          }}
        >
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    backgroundColor: theme.palette.grey[100],
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>Disciplina</TableCell>
                <TableCell>Media Final</TableCell>
                <TableCell>Avaliacoes</TableCell>
                <TableCell>Prova Final</TableCell>
                <TableCell>Prova Inova</TableCell>
                <TableCell>Segunda Chamada</TableCell>
                <TableCell>Conhecimentos Gerais</TableCell>
                <TableCell>Faltas</TableCell>
                <TableCell>% Faltas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notas.map((nota) => (
                <TableRow key={nota.disciplina} hover>
                  <TableCell sx={{ minWidth: 260 }}>{nota.disciplina}</TableCell>
                  <TableCell>{formatarNota(nota.mediaFinal)}</TableCell>
                  <TableCell sx={{ color: "error.main" }}>
                    {formatarNota(nota.avaliacao)}
                  </TableCell>
                  <TableCell>{formatarNota(nota.provaFinal)}</TableCell>
                  <TableCell sx={{ color: "error.main" }}>
                    {formatarNota(nota.provaInova)}
                  </TableCell>
                  <TableCell>{formatarNota(nota.provaSegundaChamada)}</TableCell>
                  <TableCell sx={{ color: "error.main" }}>
                    {formatarNota(nota.conhecimentosGerais)}
                  </TableCell>
                  <TableCell>{nota.faltas}</TableCell>
                  <TableCell>
                    {nota.percentualFaltas.toFixed(2).replace(".", ",")}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
