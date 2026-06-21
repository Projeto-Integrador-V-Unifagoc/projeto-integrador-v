import {
  Alert,
  Box,
  Chip,
  CircularProgress,
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

import { SITUACAO_LABEL, situacaoCor, type BoletimAluno } from "../../models/nota-model";

interface FichaAlunoNotasReaisProps {
  boletim: BoletimAluno | null;
  carregando: boolean;
  erro?: string;
}

const fmtMedia = (v: number | null) => (v === null ? "—" : `${v.toFixed(1).replace(".", ",")}%`);
const fmtNota = (v: number | null) => (v === null ? "Não lançada" : v.toFixed(2).replace(".", ","));

export function FichaAlunoNotasReais({ boletim, carregando, erro }: FichaAlunoNotasReaisProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (carregando) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }
  if (erro) return <Alert severity="error">{erro}</Alert>;
  if (!boletim || boletim.disciplinas.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: `1px dashed ${theme.palette.divider}`, borderRadius: 3 }}>
        <GraduationCap size={40} color="#9E9E9E" style={{ marginBottom: 12 }} />
        <Typography variant="subtitle1" fontWeight={700}>
          Nenhuma nota lançada para este aluno.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={700}>
          Notas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {boletim.disciplinas.length} disciplina(s)
        </Typography>
      </Stack>

      {boletim.possuiAlerta && <Alert severity="warning">Há disciplina(s) com média parcial abaixo de 60%.</Alert>}

      {isMobile ? (
        <Stack spacing={1.5}>
          {boletim.disciplinas.map((d) => (
            <Paper key={d.turmaDisciplinaId} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, p: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {d.disciplinaNome}
                </Typography>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Média parcial: {fmtMedia(d.mediaParcial)}</Typography>
                  <Chip size="small" color={situacaoCor(d.situacao)} label={SITUACAO_LABEL[d.situacao]} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Média final: {fmtMedia(d.mediaFinal)} · Recuperação: {fmtNota(d.notaRecuperacao)}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { backgroundColor: theme.palette.grey[100], fontWeight: 700 } }}>
                <TableCell>Disciplina</TableCell>
                <TableCell>Turma</TableCell>
                <TableCell align="right">Pontos</TableCell>
                <TableCell align="right">Média parcial</TableCell>
                <TableCell align="right">Recuperação</TableCell>
                <TableCell align="right">Média final</TableCell>
                <TableCell>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {boletim.disciplinas.map((d) => (
                <TableRow key={d.turmaDisciplinaId} hover>
                  <TableCell>{d.disciplinaNome}</TableCell>
                  <TableCell>{d.turmaSigla}</TableCell>
                  <TableCell align="right">
                    {d.pontosObtidos} / {d.pontosMaximos}
                  </TableCell>
                  <TableCell align="right" sx={{ color: d.mediaParcial !== null && d.mediaParcial < 60 ? "error.main" : "text.primary" }}>
                    {fmtMedia(d.mediaParcial)}
                  </TableCell>
                  <TableCell align="right">{fmtNota(d.notaRecuperacao)}</TableCell>
                  <TableCell align="right">{fmtMedia(d.mediaFinal)}</TableCell>
                  <TableCell>
                    <Chip size="small" color={situacaoCor(d.situacao)} label={SITUACAO_LABEL[d.situacao]} />
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
