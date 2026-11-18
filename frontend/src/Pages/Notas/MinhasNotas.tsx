import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, CircularProgress, MenuItem, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { ChevronDown, ClipboardList, FileText, Puzzle, RotateCcw, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AvisoDetalhe,
  CORES_DASHBOARD,
  CORES_TIPO_AVALIACAO,
  PESO,
  PaginaCabecalho,
  PaginaPadrao,
  TIPO_DASHBOARD,
  sxCartaoDashboard,
  sxIconeQuadrado,
  sxSelo,
  sxTabelaDados,
} from "../../components/DashboardLayout";
import type { TomEstado } from "../../components/DashboardLayout";
import DataTable from "../../components/DataTable/DataTable";
import NoData from "../../components/DataTable/NoData";
import TextField from "../../components/TextField";
import { useNota } from "../../hooks/use-nota";
import { SITUACAO_LABEL, type BoletimAluno, type DisciplinaBoletim, type TipoAvaliacaoNota } from "../../models/nota-model";
import { formatarPontos, ROTULO_TIPO_AVALIACAO } from "../../utils/avaliacao";
import { corMedia } from "../Home/aluno/estilos-risco";
import { formatarMedia, formatarNota, mensagemErro, tomSituacaoNota } from "./notas-utils";

type AvaliacaoDisciplina = DisciplinaBoletim["avaliacoes"][number];

const ICONE_TIPO: Record<TipoAvaliacaoNota, LucideIcon> = { PROVA: ClipboardList, TRABALHO: FileText, TPI: Puzzle, RECUPERACAO: RotateCcw };

const TOM_MEDIA: Record<ReturnType<typeof corMedia>, TomEstado> = { error: "critico", warning: "atencao", success: "neutro", default: "neutro" };

const colunasAvaliacoes: GridColDef<AvaliacaoDisciplina>[] = [
  {
    field: "tipo",
    headerName: "Tipo",
    width: 140,
    sortable: false,
    renderCell: ({ row }) => {
      const Icone = ICONE_TIPO[row.tipo] ?? ClipboardList;
      return (
        <Stack direction="row" alignItems="center" gap={0.75} height="100%">
          <Box aria-hidden="true" sx={sxIconeQuadrado(CORES_TIPO_AVALIACAO[row.tipo] ?? CORES_TIPO_AVALIACAO.PROVA, 20)}>
            <Icone size={12} />
          </Box>
          <span>{ROTULO_TIPO_AVALIACAO[row.tipo]}</span>
        </Stack>
      );
    },
  },
  {
    field: "descricao",
    headerName: "Avaliação",
    flex: 1,
    minWidth: 220,
    sortable: false,
    valueGetter: (_, row) => row.descricao || "Sem descrição",
  },
  {
    field: "valorObtido",
    headerName: "Nota obtida",
    width: 130,
    align: "right",
    headerAlign: "right",
    sortable: false,
    renderCell: ({ row }) => (
      <Typography component="span" sx={{ fontSize: "inherit", fontWeight: row.lancada ? PESO.forte : PESO.regular, color: row.lancada ? CORES_DASHBOARD.texto : CORES_DASHBOARD.textoApagado }}>
        {formatarNota(row.valorObtido)}
      </Typography>
    ),
  },
  {
    field: "valorMaximo",
    headerName: "Máximo",
    width: 110,
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
    <PaginaPadrao>
      <PaginaCabecalho
        titulo="Minhas notas"
        subtitulo="Notas e médias por disciplina."
        icone={Star}
        acoes={periodos.length > 1 ? (
          <TextField select label="Período letivo" value={periodo} onChange={(e) => setPeriodo(e.target.value)} sx={{ width: { xs: "100%", sm: 200 } }}>
            <MenuItem value="todos">Todos os períodos</MenuItem>
            {periodos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.codigo}
              </MenuItem>
            ))}
          </TextField>
        ) : undefined}
      />

      {erro && <Alert severity="error">{erro}</Alert>}
      {boletim?.possuiAlerta && (
        <AvisoDetalhe gravidade="media">Você possui ao menos uma disciplina com média parcial abaixo de 60%. Acompanhe seu desempenho.</AvisoDetalhe>
      )}

      {!boletim && !erro && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      )}

      {boletim && disciplinas.length === 0 && (
        <Box minHeight={360} sx={sxCartaoDashboard}>
          <NoData
            title="Nenhuma avaliação encontrada"
            description="As avaliações e notas aparecerão aqui assim que forem publicadas pelo professor."
          />
        </Box>
      )}

      {disciplinas.map((d) => (
        <DisciplinaCard key={d.turmaDisciplinaId} disciplina={d} />
      ))}
    </PaginaPadrao>
  );
}

function DisciplinaCard({ disciplina }: { disciplina: DisciplinaBoletim }) {
  const tomMedia = TOM_MEDIA[corMedia(disciplina.mediaParcial)];
  const tomSituacao = tomSituacaoNota(disciplina.situacao);

  return (
    <Accordion
      disableGutters
      defaultExpanded
      elevation={0}
      sx={{ ...sxCartaoDashboard, overflow: "hidden", "&:before": { display: "none" }, "&.Mui-expanded": { m: 0 } }}
    >
      <AccordionSummary expandIcon={<ChevronDown size={18} aria-hidden="true" />} sx={{ px: 2, minHeight: 56, "& .MuiAccordionSummary-content": { my: 1 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1} width="100%" pr={1.5}>
          <Box minWidth={0}>
            <Typography sx={{ fontSize: TIPO_DASHBOARD.painel, fontWeight: PESO.forte }}>{disciplina.disciplinaNome}</Typography>
            <Typography sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
              {disciplina.turmaSigla} · {disciplina.professorNome} · {disciplina.periodoLetivo.codigo}
            </Typography>
          </Box>
          <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
            <Box component="span" sx={sxSelo(tomMedia, { ponto: tomMedia !== "neutro" })}>Média parcial {formatarMedia(disciplina.mediaParcial)}</Box>
            {disciplina.mediaFinal !== null && <Box component="span" sx={sxSelo("neutro")}>Média final {formatarMedia(disciplina.mediaFinal)}</Box>}
            <Box component="span" sx={sxSelo(tomSituacao, { ponto: tomSituacao !== "neutro" })}>{SITUACAO_LABEL[disciplina.situacao]}</Box>
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
        <DataTable
          rows={disciplina.avaliacoes}
          columns={colunasAvaliacoes}
          hideFooter
          disableColumnMenu
          emptyTitle="Nenhuma avaliação cadastrada nesta disciplina"
          emptyDescription="As avaliações aparecerão aqui quando forem cadastradas pelo professor."
          sx={{
            ...sxTabelaDados,
            height: disciplina.avaliacoes.length === 0 ? 260 : 38 + disciplina.avaliacoes.length * 34,
            minHeight: 0,
          }}
        />
        {disciplina.notaRecuperacao !== null && (
          <Typography sx={{ mt: 1.5, fontSize: TIPO_DASHBOARD.secundario }}>
            Recuperação: <strong>{formatarNota(disciplina.notaRecuperacao)}</strong> · Média final: <strong>{formatarMedia(disciplina.mediaFinal)}</strong>
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
