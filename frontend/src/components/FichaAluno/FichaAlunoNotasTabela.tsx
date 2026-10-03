import {
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
import { formatarPontos } from "../../utils/pontos";
import { ResultadoAcademicoResumo } from "../ResultadoAcademico/ResultadoAcademicoResumo";

interface FichaAlunoNotasTabelaProps {
  notas: NotaAluno[];
  semestre: string;
}

export function FichaAlunoNotasTabela(props: FichaAlunoNotasTabelaProps) {
  const { notas, semestre } = props;
  const theme = useTheme();
  const larguraResultado = useMediaQuery(theme.breakpoints.down("md")) ? 260 : 360;

  const avaliacoes = [...new Map(notas.flatMap((n) => n.avaliacoes ?? []).map((a) => [a.id, a])).values()];

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
            sx={{ minWidth: Math.max(760, 620 + avaliacoes.length * 120) }}
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
                <TableCell>Resultado acadêmico</TableCell>
                {avaliacoes.map((avaliacao) => (
                  <TableCell key={avaliacao.id}>{avaliacao.nome || avaliacao.id}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {notas.map((nota) => (
                <TableRow key={`${nota.turmaDisciplinaId}:${nota.matriculaTurmaDisciplinaId ?? ""}`} hover>
                  <TableCell sx={{ minWidth: 260 }}>
                    {nota.disciplina}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {[nota.turmaNome, nota.periodoLetivo, nota.professorNome].filter(Boolean).join(" · ")}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: larguraResultado, minWidth: larguraResultado, maxWidth: larguraResultado }}><ResultadoAcademicoResumo resultado={nota.resultadoAcademico} compacto /></TableCell>
                  {avaliacoes.map((avaliacao) => {
                    const a = (nota.avaliacoes ?? []).find((x) => x.id === avaliacao.id
                      && (!nota.matriculaTurmaDisciplinaId || x.matricula_turma_disciplina_id === nota.matriculaTurmaDisciplinaId));
                    return (
                      <TableCell
                        key={avaliacao.id}
                      >
                        {formatarPontos(a?.nota)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
