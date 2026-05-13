import { useEffect, useState } from "react";
import { Alert, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Pencil, Trash2 } from "lucide-react";
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
  const { listarDisciplinas, removerDisciplina, carregando } = useDisciplina()
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
      ativo: disciplina.ativo,
    }))
    setDisciplinas(disciplinasMapeadas)
  }

  useEffect(() => {
    void (async () => {
      await carregarDisciplinas()
    })()
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

  const columns: GridColDef<DisciplinaView>[] = [
    { field: "codigo", headerName: "Codigo", width: 140 },
    { field: "nome", headerName: "Nome", flex: 1 },
    { field: "cargaHoraria", headerName: "Carga Horaria", width: 150 },
    { field: "preRequisito", headerName: "Pre-requisito", flex: 1 },
    {
      field: "ativo",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (params.row.ativo ? "Ativa" : "Inativa"),
    },
    {
      field: "id",
      headerName: "Acoes",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => navigate(`/disciplinas/${params.row.id}`)} color="primary">
            <Pencil size={18} />
          </IconButton>
          <IconButton onClick={() => setDisciplinaParaExcluir(params.row)} color="error">
            <Trash2 size={18} />
          </IconButton>
        </>
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
                    <Typography variant="body2"><strong>Pre-requisito:</strong> {disciplina.preRequisito || "-"}</Typography>
                    <Typography variant="body2"><strong>Status:</strong> {disciplina.ativo ? "Ativa" : "Inativa"}</Typography>
                    <Stack direction="row" justifyContent="flex-end" gap={1}>
                      <Button variant="outlined" onClick={() => navigate(`/disciplinas/${disciplina.id}`)}>
                        Editar
                      </Button>
                      <Button variant="contained" color="error" onClick={() => setDisciplinaParaExcluir(disciplina)}>
                        Excluir
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
