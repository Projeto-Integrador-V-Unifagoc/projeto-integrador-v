import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Chip, Grid, IconButton, MenuItem, Paper, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { CirclePause, CirclePlay, Eye, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/Container";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import DataTable from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { Dialog } from "../../components/Dialog";
import { useDisciplina } from "../../hooks/use-disciplina";
import type { AreaConhecimento, DisciplinaResponse, DisciplinaView } from "../../models/disciplina-model";
import {
  estadoCadastroDisciplina, filtrarDisciplinas,
  type CompletudeDisciplina, type SituacaoDisciplina,
} from "./disciplina-filters";

const AREAS: Array<{ value: AreaConhecimento; label: string }> = [
  { value: "COMPUTACAO", label: "Computação" }, { value: "MATEMATICA", label: "Matemática" },
  { value: "CIENCIAS_HUMANAS", label: "Ciências Humanas" }, { value: "ADMINISTRACAO_GESTAO", label: "Administração e Gestão" },
  { value: "COMUNICACAO", label: "Comunicação" }, { value: "CIENCIAS_NATUREZA", label: "Ciências da Natureza" },
  { value: "FORMACAO_GERAL", label: "Formação Geral" }, { value: "OUTRA", label: "Outra" },
];

function chipCadastro(disciplina: DisciplinaView) {
  const estado = estadoCadastroDisciplina(disciplina);
  if (estado === "PENDENTE_DADOS") return <Chip size="small" color="warning" label="Dados pendentes" />;
  if (estado === "SEM_COMPETENCIAS") return <Chip size="small" color="info" variant="outlined" label="Sem competências" />;
  return <Chip size="small" color="success" label="Completo" />;
}

export default function Disciplinas() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const navigate = useNavigate()
  const { listarDisciplinas, removerDisciplina, alterarStatus, carregando } = useDisciplina()
  const [disciplinas, setDisciplinas] = useState<DisciplinaView[]>([])
  const [disciplinaParaExcluir, setDisciplinaParaExcluir] = useState<DisciplinaView | null>(null)
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null)
  const [busca, setBusca] = useState("")
  const [area, setArea] = useState<AreaConhecimento | "TODAS">("TODAS")
  const [situacao, setSituacao] = useState<SituacaoDisciplina>("TODAS")
  const [completude, setCompletude] = useState<CompletudeDisciplina>("TODAS")

  async function carregarDisciplinas() {
    const data = await listarDisciplinas()
    const disciplinasMapeadas = data.map((disciplina: DisciplinaResponse) => ({
      id: disciplina.id,
      codigo: disciplina.codigo,
      nome: disciplina.nome,
      cargaHoraria: disciplina.carga_horaria,
      preRequisito: disciplina.pre_requisito,
      areaConhecimento: disciplina.area_conhecimento,
      quantidadeCompetencias: disciplina.quantidade_competencias ?? 0,
      cadastroCompleto: Boolean(disciplina.cadastro_completo),
      ativo: disciplina.ativo,
    }))
    setDisciplinas(disciplinasMapeadas)
  }

  useEffect(() => {
    void (async () => {
      await carregarDisciplinas()
    })()
    // O carregamento ocorre na montagem; a função do hook não tem identidade estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const disciplinasFiltradas = useMemo(
    () => filtrarDisciplinas(disciplinas, { busca, area, situacao, completude }),
    [area, busca, completude, disciplinas, situacao],
  )

  async function confirmarExclusao() {
    if (!disciplinaParaExcluir) {
      return
    }

    try {
      await removerDisciplina(disciplinaParaExcluir.id)
      setAlerta({ tipo: "success", mensagem: "Disciplina removida com sucesso!" })
      setDisciplinaParaExcluir(null)
      void carregarDisciplinas()
    } catch (error) {
      const mensagem =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Nao foi possivel remover a disciplina."

      setDisciplinaParaExcluir(null)
      setAlerta({ tipo: "error", mensagem })
    }
  }

  async function alternarStatus(disciplina: DisciplinaView) {
    try {
      await alterarStatus(disciplina.id, !disciplina.ativo)
      setAlerta({ tipo: "success", mensagem: disciplina.ativo ? "Disciplina desativada." : "Disciplina reativada." })
      void carregarDisciplinas()
    } catch {
      setAlerta({ tipo: "error", mensagem: "Não foi possível alterar o status da disciplina." })
    }
  }

  const columns: GridColDef<DisciplinaView>[] = [
    { field: "codigo", headerName: "Codigo", width: 140 },
    { field: "nome", headerName: "Nome", flex: 1 },
    { field: "cargaHoraria", headerName: "Carga Horaria", width: 150 },
    { field: "areaConhecimento", headerName: "Área", width: 180, valueFormatter: (value) => value ? String(value).replaceAll("_", " ") : "Não informada" },
    { field: "quantidadeCompetencias", headerName: "Competências", width: 130 },
    { field: "cadastroCompleto", headerName: "Cadastro", width: 165, renderCell: (params) => chipCadastro(params.row) },
    {
      field: "ativo",
      headerName: "Status",
      width: 160,
      renderCell: (params) => (params.row.ativo ? "Ativa" : "Inativa"),
    },
    {
      field: "id",
      headerName: "Ações",
      width: 188,
      minWidth: 188,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} width="100%">
          <Tooltip title="Ver detalhes">
            <IconButton size="small" aria-label={`Ver detalhes de ${params.row.nome}`} onClick={() => navigate(`/disciplinas/${params.row.id}/detalhes`)} color="primary">
              <Eye size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small" aria-label={`Editar ${params.row.nome}`} onClick={() => navigate(`/disciplinas/${params.row.id}`)} color="primary">
              <Pencil size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.ativo ? "Desativar" : "Reativar"}>
            <IconButton size="small" aria-label={params.row.ativo ? `Desativar ${params.row.nome}` : `Reativar ${params.row.nome}`} onClick={() => void alternarStatus(params.row)} color={params.row.ativo ? "warning" : "success"}>
              {params.row.ativo ? <CirclePause size={18} /> : <CirclePlay size={18} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton size="small" aria-label={`Excluir ${params.row.nome}`} onClick={() => setDisciplinaParaExcluir(params.row)} color="error">
              <Trash2 size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  return (
    <Container>
      <Stack gap={2}>
        <SearchTextField addPath="/disciplinas/cadastro" placeholder="Pesquisar por código, nome, requisito ou área" searchValue={busca} onSearchChange={setBusca} showFilters={false}>
          Disciplinas
        </SearchTextField>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth label="Área" value={area} onChange={(e) => setArea(e.target.value as AreaConhecimento | "TODAS")}><MenuItem value="TODAS">Todas as áreas</MenuItem>{AREAS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth label="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoDisciplina)}><MenuItem value="TODAS">Ativas e inativas</MenuItem><MenuItem value="ATIVAS">Ativas</MenuItem><MenuItem value="INATIVAS">Inativas</MenuItem></TextField></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth label="Completude" value={completude} onChange={(e) => setCompletude(e.target.value as CompletudeDisciplina)}><MenuItem value="TODAS">Todos os cadastros</MenuItem><MenuItem value="COMPLETAS">Completos</MenuItem><MenuItem value="PENDENTE_DADOS">Dados pendentes</MenuItem><MenuItem value="SEM_COMPETENCIAS">Sem competências</MenuItem></TextField></Grid>
          </Grid>
        </Paper>

        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

        {isMobile ? (
          <Stack gap={2}>
            {disciplinasFiltradas.map((disciplina) => (
              <Card.Root key={disciplina.id}>
                <Card.Header>
                  <Card.Title>{disciplina.nome}</Card.Title>
                </Card.Header>
                <Card.Content>
                  <Stack gap={1}>
                    <Typography variant="body2"><strong>Codigo:</strong> {disciplina.codigo}</Typography>
                    <Typography variant="body2"><strong>Carga Horaria:</strong> {disciplina.cargaHoraria}</Typography>
                    <Typography variant="body2"><strong>Área:</strong> {disciplina.areaConhecimento?.replaceAll("_", " ") || "Não informada"}</Typography>
                    <Typography variant="body2"><strong>Competências:</strong> {disciplina.quantidadeCompetencias}</Typography>
                    <Stack direction="row" alignItems="center" gap={1}><Typography variant="body2"><strong>Cadastro:</strong></Typography>{chipCadastro(disciplina)}</Stack>
                    <Typography variant="body2"><strong>Pre-requisito:</strong> {disciplina.preRequisito || "-"}</Typography>
                    <Typography variant="body2"><strong>Status:</strong> {disciplina.ativo ? "Ativa" : "Inativa"}</Typography>
                    <Stack direction="row" justifyContent="flex-end" flexWrap="wrap" gap={1} sx={{ "& > button": { width: "auto", minWidth: 88, height: 36, whiteSpace: "nowrap" } }}>
                      <Button variant="outlined" onClick={() => navigate(`/disciplinas/${disciplina.id}/detalhes`)}>
                        Detalhes
                      </Button>
                      <Button variant="outlined" onClick={() => navigate(`/disciplinas/${disciplina.id}`)}>
                        Editar
                      </Button>
                      <Button variant="contained" color="error" onClick={() => setDisciplinaParaExcluir(disciplina)}>
                        Excluir
                      </Button>
                      <Button variant="outlined" color={disciplina.ativo ? "warning" : "success"} onClick={() => void alternarStatus(disciplina)}>
                        {disciplina.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </Stack>
                  </Stack>
                </Card.Content>
              </Card.Root>
            ))}
            {!carregando && !disciplinasFiltradas.length && <Alert severity="info">Nenhuma disciplina encontrada com os filtros atuais.</Alert>}
          </Stack>
        ) : (
          <DataTable columns={columns} rows={disciplinasFiltradas} loading={carregando} emptyTitle="Nenhuma disciplina encontrada" emptyDescription={disciplinas.length ? "Ajuste os filtros para ver outros resultados." : "Cadastre a primeira disciplina do catálogo."} />
        )}
      </Stack>

      <Dialog.Root open={!!disciplinaParaExcluir} onClose={() => setDisciplinaParaExcluir(null)} maxWidth="xs">
        <Dialog.Header>
          <Dialog.Title>Excluir disciplina</Dialog.Title>
          <Dialog.ActionClose onClose={() => setDisciplinaParaExcluir(null)} />
        </Dialog.Header>
        <Dialog.Content>
          <Typography>
            Deseja realmente excluir a disciplina {disciplinaParaExcluir?.nome}?
          </Typography>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={() => setDisciplinaParaExcluir(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarExclusao}>Excluir</Button>
        </Dialog.Footer>
      </Dialog.Root>
    </Container>
  )
}
