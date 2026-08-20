import { Chip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { formatarDataPtBr } from "../../utils/avaliacao";
import type { SituacaoFrequencia, StatusFrequencia } from "../../models/frequencia-model";
import { corSituacao, corStatus, formatarPercentual, rotuloSituacao, rotuloStatus } from "./frequencia-utils";

// Colunas do consolidado, compartilhadas entre a visão do aluno e o relatório operacional.
export const colunasConsolidado = (incluirAluno: boolean): GridColDef[] => [
  { field: "disciplinaNome", headerName: "Disciplina", flex: 1, minWidth: 180 },
  ...(incluirAluno ? [{ field: "alunoNome", headerName: "Aluno", flex: 1, minWidth: 180 } as GridColDef] : []),
  { field: "totalAulas", headerName: "Aulas", width: 90 },
  { field: "presencas", headerName: "Presenças", width: 110 },
  { field: "faltas", headerName: "Faltas", width: 90 },
  { field: "naoLancadas", headerName: "Não lançadas", width: 130 },
  { field: "percentual", headerName: "Frequência", width: 120, valueFormatter: (v) => formatarPercentual(v as number | null) },
  {
    field: "situacao",
    headerName: "Situação",
    width: 180,
    renderCell: ({ value }) => (
      <Chip size="small" color={corSituacao(value as SituacaoFrequencia)} label={rotuloSituacao(value as SituacaoFrequencia)} />
    ),
  },
];

// Colunas do histórico aula a aula do aluno; "acoes" recebe o botão Justificar via fábrica externa.
export const colunasHistorico = (acoes: GridColDef): GridColDef[] => [
  { field: "data", headerName: "Data", width: 120, valueFormatter: (v) => formatarDataPtBr(v as string) },
  { field: "disciplinaNome", headerName: "Disciplina", flex: 1, minWidth: 200 },
  {
    field: "status",
    headerName: "Status",
    width: 130,
    renderCell: ({ value }) => (
      <Chip size="small" variant="outlined" color={corStatus(value as StatusFrequencia)} label={rotuloStatus(value as StatusFrequencia)} />
    ),
  },
  {
    field: "motivoJustificativa",
    headerName: "Justificativa",
    flex: 1,
    minWidth: 200,
    renderCell: ({ value }) =>
      value ? (
        <Typography variant="body2">{String(value)}</Typography>
      ) : (
        <Typography variant="body2" color="text.disabled">
          —
        </Typography>
      ),
  },
  acoes,
];
