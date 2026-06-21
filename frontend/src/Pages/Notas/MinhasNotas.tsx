import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ChevronDown, GraduationCap } from "lucide-react";
import Container from "../../components/Container";
import { useNota } from "../../hooks/use-nota";
import { SITUACAO_LABEL, situacaoCor, type BoletimAluno, type DisciplinaBoletim } from "../../models/nota-model";

const mensagemErro = (erro: unknown) => {
  const e = erro as { response?: { data?: { mensagem?: string } }; message?: string };
  return e.response?.data?.mensagem || e.message || "Não foi possível carregar suas notas.";
};

const formatarMedia = (valor: number | null) => (valor === null ? "—" : `${valor.toFixed(1).replace(".", ",")}%`);
const formatarNota = (valor: number | null) => (valor === null ? "Não lançada" : valor.toFixed(2).replace(".", ","));

export default function MinhasNotas() {
  const api = useNota();
  const [boletim, setBoletim] = useState<BoletimAluno | null>(null);
  const [erro, setErro] = useState<string>();
  const [periodo, setPeriodo] = useState("todos");

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const r = await api.meuBoletim();
        if (ativo) setBoletim(r);
      } catch (e) {
        if (ativo) setErro(mensagemErro(e));
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periodos = useMemo(() => {
    const mapa = new Map<string, string>();
    boletim?.disciplinas.forEach((d) => mapa.set(d.periodoLetivo.id, d.periodoLetivo.codigo));
    return [...mapa.entries()].map(([id, codigo]) => ({ id, codigo }));
  }, [boletim]);

  const disciplinas = useMemo(
    () => (boletim?.disciplinas ?? []).filter((d) => periodo === "todos" || d.periodoLetivo.id === periodo),
    [boletim, periodo],
  );

  return (
    <Container sx={{ p: { xs: 2, md: 3 } }}>
      <Stack gap={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
          <Typography variant="h5" fontWeight={700}>
            Minhas Notas
          </Typography>
          {periodos.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Período letivo</InputLabel>
              <Select label="Período letivo" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                <MenuItem value="todos">Todos os períodos</MenuItem>
                {periodos.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.codigo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        {erro && <Alert severity="error">{erro}</Alert>}
        {boletim?.possuiAlerta && (
          <Alert severity="warning">
            Você possui ao menos uma disciplina com média parcial abaixo de 60%. Acompanhe seu desempenho.
          </Alert>
        )}

        {!boletim && !erro && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}

        {boletim && disciplinas.length === 0 && (
          <Paper elevation={0} sx={{ p: 6, textAlign: "center", border: "1px dashed", borderColor: "grey.300", borderRadius: 3 }}>
            <GraduationCap size={48} color="#9E9E9E" style={{ marginBottom: 16 }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Nenhuma nota lançada até o momento.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              As notas aparecerão aqui assim que forem publicadas pelo professor.
            </Typography>
          </Paper>
        )}

        {disciplinas.map((d) => (
          <DisciplinaCard key={d.turmaDisciplinaId} disciplina={d} />
        ))}
      </Stack>
    </Container>
  );
}

function DisciplinaCard({ disciplina }: { disciplina: DisciplinaBoletim }) {
  return (
    <Accordion disableGutters defaultExpanded elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ChevronDown size={18} />}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1} width="100%" pr={2}>
          <Box>
            <Typography fontWeight={700}>{disciplina.disciplinaNome}</Typography>
            <Typography variant="body2" color="text.secondary">
              {disciplina.turmaSigla} · {disciplina.professorNome} · {disciplina.periodoLetivo.codigo}
            </Typography>
          </Box>
          <Stack direction="row" gap={1} alignItems="center">
            <Chip
              size="small"
              color={disciplina.mediaParcial !== null && disciplina.mediaParcial < 60 ? "error" : "default"}
              label={`Média parcial: ${formatarMedia(disciplina.mediaParcial)}`}
            />
            <Chip size="small" color={situacaoCor(disciplina.situacao)} label={SITUACAO_LABEL[disciplina.situacao]} />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700 } }}>
              <TableCell>Avaliação</TableCell>
              <TableCell align="right">Nota obtida</TableCell>
              <TableCell align="right">Máximo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {disciplina.avaliacoes.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma avaliação cadastrada nesta disciplina.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {disciplina.avaliacoes.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  {a.tipo}
                  {a.descricao ? ` — ${a.descricao}` : ""}
                </TableCell>
                <TableCell align="right" sx={{ color: a.lancada ? "text.primary" : "text.disabled" }}>
                  {formatarNota(a.valorObtido)}
                </TableCell>
                <TableCell align="right">{a.valorMaximo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {disciplina.notaRecuperacao !== null && (
          <Typography variant="body2" mt={1}>
            Recuperação: <strong>{formatarNota(disciplina.notaRecuperacao)}</strong> · Média final:{" "}
            <strong>{formatarMedia(disciplina.mediaFinal)}</strong>
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
