import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { ChevronDown } from "lucide-react";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import NoData from "../../components/DataTable/NoData";
import TextField from "../../components/TextField";
import { useNota } from "../../hooks/use-nota";
import { SITUACAO_LABEL, situacaoCor, type BoletimAluno, type DisciplinaBoletim } from "../../models/nota-model";
import { COR_TIPO_AVALIACAO, formatarPontos, ROTULO_TIPO_AVALIACAO } from "../../utils/avaliacao";
import { formatarMedia, formatarNota, mensagemErro } from "./notas-utils";

type AvaliacaoDisciplina = DisciplinaBoletim["avaliacoes"][number];

const colunasAvaliacoes: GridColDef<AvaliacaoDisciplina>[] = [
  {
    field: "tipo",
    headerName: "Tipo",
    width: 130,
    sortable: false,
    renderCell: ({ row }) => (
      <Chip
        size="small"
        variant="outlined"
        color={COR_TIPO_AVALIACAO[row.tipo]}
        label={ROTULO_TIPO_AVALIACAO[row.tipo]}
      />
    ),
  },
  {
    field: "descricao",
    headerName: "Avaliação",
    flex: 1,
    minWidth: 240,
    sortable: false,
    valueGetter: (_, row) => row.descricao || "Sem descrição",
  },
  {
    field: "valorObtido",
    headerName: "Nota obtida",
    width: 150,
    align: "right",
    headerAlign: "right",
    sortable: false,
    renderCell: ({ row }) => (
      <Typography
        variant="body2"
        color={row.lancada ? "text.primary" : "text.disabled"}
        fontStyle={row.lancada ? "normal" : "italic"}
      >
        {formatarNota(row.valorObtido)}
      </Typography>
    ),
  },
  {
    field: "valorMaximo",
    headerName: "Máximo",
    width: 130,
    align: "right",
    headerAlign: "right",
    sortable: false,
    valueFormatter: (valor) => formatarPontos(Number(valor)),
  },
];

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
          <Typography component="h1" variant="h5" fontWeight={700}>
            Minhas Notas
          </Typography>
          {periodos.length > 1 && (
            <TextField
              select
              label="Período letivo"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              sx={{ minWidth: 200, maxWidth: { sm: 260 } }}
            >
              <MenuItem value="todos">Todos os períodos</MenuItem>
              {periodos.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.codigo}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        {erro && <Alert severity="error">{erro}</Alert>}
        {boletim?.possuiAlerta && (
          <Alert severity="warning">Você possui ao menos uma disciplina com média parcial abaixo de 60%. Acompanhe seu desempenho.</Alert>
        )}

        {!boletim && !erro && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}

        {boletim && disciplinas.length === 0 && (
          <Box minHeight={360} border="1px solid" borderColor="divider" borderRadius={2}>
            <NoData
              title="Nenhuma avaliação encontrada"
              description="As avaliações e notas aparecerão aqui assim que forem publicadas pelo professor."
            />
          </Box>
        )}

        {disciplinas.map((d) => (
          <DisciplinaCard key={d.turmaDisciplinaId} disciplina={d} />
        ))}
      </Stack>
    </Container>
  );
}

function DisciplinaCard({ disciplina }: { disciplina: DisciplinaBoletim }) {
  const abaixoDe60 = disciplina.mediaParcial !== null && disciplina.mediaParcial < 60;

  return (
    <Accordion
      disableGutters
      defaultExpanded
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        backgroundColor: "#FFF",
        "&:before": { display: "none" },
        "& .MuiAccordionSummary-root, & .MuiAccordionDetails-root": {
          backgroundColor: "#FFF",
        },
      }}
    >
      <AccordionSummary expandIcon={<ChevronDown size={18} aria-hidden="true" />}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1} width="100%" pr={2}>
          <Box>
            <Typography fontWeight={700}>{disciplina.disciplinaNome}</Typography>
            <Typography variant="body2" color="text.secondary">
              {disciplina.turmaSigla} · {disciplina.professorNome} · {disciplina.periodoLetivo.codigo}
            </Typography>
          </Box>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" variant="outlined" color={abaixoDe60 ? "error" : "default"} label={`Média parcial: ${formatarMedia(disciplina.mediaParcial)}`} />
            {disciplina.mediaFinal !== null && (
              <Chip size="small" variant="outlined" label={`Média final: ${formatarMedia(disciplina.mediaFinal)}`} />
            )}
            <Chip size="small" color={situacaoCor(disciplina.situacao)} label={SITUACAO_LABEL[disciplina.situacao]} />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <DataTable
          rows={disciplina.avaliacoes}
          columns={colunasAvaliacoes}
          hideFooter
          disableColumnMenu
          emptyTitle="Nenhuma avaliação cadastrada nesta disciplina"
          emptyDescription="As avaliações aparecerão aqui quando forem cadastradas pelo professor."
          sx={{
            mt: 0,
            backgroundColor: "#FFF",
            height: disciplina.avaliacoes.length === 0
              ? 260
              : 38 + disciplina.avaliacoes.length * 34,
            minHeight: 0,
          }}
        />
        {disciplina.notaRecuperacao !== null && (
          <Typography variant="body2" mt={1.5}>
            Recuperação: <strong>{formatarNota(disciplina.notaRecuperacao)}</strong> · Média final:{" "}
            <strong>{formatarMedia(disciplina.mediaFinal)}</strong>
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
