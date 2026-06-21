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

  // collect unique evaluation names to create one column per evaluation
  const evalNames = Array.from(
    new Set(
      notas.flatMap((n) => (n.avaliacoes ?? []).map((a) => a.nome || a.id)),
    ),
  );

  // short labels for headers (remove descriptive suffixes like " - Excelente desempenho")
  const evalLabels = evalNames.map((n) => ({
    name: n,
    label: (n || "").split(" - ")[0].trim(),
  }));

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
          <Table
            size="small"
            sx={{ minWidth: Math.max(980, 240 + evalNames.length * 120) }}
          >
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
                {evalLabels.map(({ name, label }) => (
                  <TableCell key={name}>{label}</TableCell>
                ))}
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
                  <TableCell sx={{ minWidth: 260 }}>
                    {nota.disciplina}
                  </TableCell>
                  <TableCell>{formatarNota(nota.mediaFinal)}</TableCell>
                  {evalNames.map((name) => {
                    const a = (nota.avaliacoes ?? []).find((x) => {
                      const matchesName = x.nome === name || x.id === name;
                      // if nota has a matriculaTurmaDisciplinaId, prefer the avaliacao with same mtd id
                      if ((nota as any).matriculaTurmaDisciplinaId) {
                        return (
                          matchesName &&
                          x.matricula_turma_disciplina_id ===
                            (nota as any).matriculaTurmaDisciplinaId
                        );
                      }
                      return matchesName;
                    });
                    return (
                      <TableCell
                        key={name}
                        sx={{ color: a ? "error.main" : "inherit" }}
                      >
                        {a ? formatarNota(a.nota) : "-"}
                      </TableCell>
                    );
                  })}
                  <TableCell>{formatarNota(nota.provaFinal)}</TableCell>
                  <TableCell sx={{ color: "error.main" }}>
                    {formatarNota(nota.provaInova)}
                  </TableCell>
                  <TableCell>
                    {formatarNota(nota.provaSegundaChamada)}
                  </TableCell>
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
