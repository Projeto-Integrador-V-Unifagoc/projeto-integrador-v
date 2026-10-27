import { useEffect, useState } from "react";
import { Alert, Chip, IconButton, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { CirclePause, CirclePlay, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/Container";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import DataTable from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import Button from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { useDisciplina } from "../../hooks/use-disciplina";
import type { DisciplinaResponse, DisciplinaView } from "../../models/disciplina-model";

export default function Disciplinas() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const navigate = useNavigate()
  const { listarDisciplinas, removerDisciplina, alterarStatus, carregando } = useDisciplina()
  const [disciplinas, setDisciplinas] = useState<DisciplinaView[]>([])
  const [disciplinaParaExcluir, setDisciplinaParaExcluir] = useState<DisciplinaView | null>(null)
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null)

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

  async function confirmarExclusao() {
    if (!disciplinaParaExcluir) {
      return
    }

    try {
      await removerDisciplina(disciplinaParaExcluir.id)
      setAlerta({ tipo: "success", mensagem: "Disciplina removida com sucesso!" })
      setDisciplinaParaExcluir(null)
      void carregarDisciplinas()
    } catch {
      setAlerta({ tipo: "error", mensagem: "Nao foi possivel remover a disciplina." })
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
    { field: "cadastroCompleto", headerName: "Cadastro", width: 130, renderCell: (params) => <Chip size="small" color={params.row.cadastroCompleto ? "success" : "warning"} label={params.row.cadastroCompleto ? "Completo" : "Pendente"} /> },
    {
      field: "ativo",
      headerName: "Status",
      width: 160,
      renderCell: (params) => (params.row.ativo ? "Ativa" : "Inativa"),
    },
    {
      field: "id",
      headerName: "Ações",
      width: 152,
      minWidth: 152,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} width="100%">
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
        <SearchTextField addPath="/disciplinas/cadastro" placeholder="Pesquisar Disciplinas" showFilters={false}>
          Disciplinas
        </SearchTextField>

        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

        {isMobile ? (
          <Stack gap={2}>
            {disciplinas.map((disciplina) => (
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
                    <Typography variant="body2"><strong>Pre-requisito:</strong> {disciplina.preRequisito || "-"}</Typography>
                    <Typography variant="body2"><strong>Status:</strong> {disciplina.ativo ? "Ativa" : "Inativa"}</Typography>
                    <Stack direction="row" justifyContent="flex-end" flexWrap="wrap" gap={1} sx={{ "& > button": { width: "auto", minWidth: 88, height: 36, whiteSpace: "nowrap" } }}>
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
          </Stack>
        ) : (
          <DataTable columns={columns} rows={disciplinas} loading={carregando} />
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
