import { useEffect, useState } from "react";
import { Alert, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/Container";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import DataTable from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import Button from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { useCurso } from "../../hooks/use-curso";
import type { CursoResponse, CursoView } from "../../models/curso-model";

export default function Cursos() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const navigate = useNavigate()
  const { listarCursos, removerCurso, carregando } = useCurso()
  const [cursos, setCursos] = useState<CursoView[]>([])
  const [cursoParaExcluir, setCursoParaExcluir] = useState<CursoView | null>(null)
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null)

  async function carregarCursos() {
    const data = await listarCursos()
    const cursosMapeados = data.map((curso: CursoResponse) => ({
      id: curso.id,
      codigo: curso.codigo,
      nome: curso.nome,
      departamento: curso.departamento.nome,
      faculdade: curso.departamento.faculdade.nome,
    }))
    setCursos(cursosMapeados)
  }

  useEffect(() => {
    void (async () => {
      await carregarCursos()
    })()
  }, [])

  async function confirmarExclusao() {
    if (!cursoParaExcluir) {
      return
    }

    try {
      await removerCurso(cursoParaExcluir.id)
      setAlerta({ tipo: "success", mensagem: "Curso removido com sucesso!" })
      setCursoParaExcluir(null)
      carregarCursos()
    } catch {
      setAlerta({ tipo: "error", mensagem: "Não foi possível remover o curso." })
    }
  }

  const columns: GridColDef<CursoView>[] = [
    { field: "codigo", headerName: "Código", width: 140 },
    { field: "nome", headerName: "Nome", flex: 1 },
    { field: "departamento", headerName: "Departamento", flex: 1 },
    { field: "faculdade", headerName: "Faculdade", flex: 1 },
    {
      field: "id",
      headerName: "Ações",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => navigate(`/cursos/${params.row.id}`)} color="primary">
            <Pencil size={18} />
          </IconButton>
          <IconButton onClick={() => navigate(`/cursos/${params.row.id}/matriz-curricular`)} color="secondary">
            <Eye size={18} />
          </IconButton>
          <IconButton onClick={() => setCursoParaExcluir(params.row)} color="error">
            <Trash2 size={18} />
          </IconButton>
        </>
      ),
    },
  ]

  return (
    <Container>
      <Stack gap={2}>
        <SearchTextField addPath="/cursos/cadastro" placeholder="Pesquisar Cursos" showFilters={false}>
          Cursos
        </SearchTextField>

        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

        {isMobile ? (
          <Stack gap={2}>
            {cursos.map((curso) => (
              <Card.Root key={curso.id}>
                <Card.Header>
                  <Card.Title>{curso.nome}</Card.Title>
                </Card.Header>
                <Card.Content>
                  <Stack gap={1}>
                    <Typography variant="body2"><strong>Código:</strong> {curso.codigo}</Typography>
                    <Typography variant="body2"><strong>Departamento:</strong> {curso.departamento}</Typography>
                    <Typography variant="body2"><strong>Faculdade:</strong> {curso.faculdade}</Typography>
                    <Stack direction="row" justifyContent="flex-end" gap={1}>
                      <Button variant="outlined" onClick={() => navigate(`/cursos/${curso.id}/matriz-curricular`)}>
                        Matriz
                      </Button>
                      <Button variant="outlined" onClick={() => navigate(`/cursos/${curso.id}`)}>
                        Editar
                      </Button>
                      <Button variant="contained" color="error" onClick={() => setCursoParaExcluir(curso)}>
                        Excluir
                      </Button>
                    </Stack>
                  </Stack>
                </Card.Content>
              </Card.Root>
            ))}
          </Stack>
        ) : (
          <DataTable columns={columns} rows={cursos} loading={carregando} />
        )}
      </Stack>

      <Dialog.Root open={!!cursoParaExcluir} onClose={() => setCursoParaExcluir(null)} maxWidth="xs">
        <Dialog.Header>
          <Dialog.Title>Excluir curso</Dialog.Title>
          <Dialog.ActionClose onClose={() => setCursoParaExcluir(null)} />
        </Dialog.Header>
        <Dialog.Content>
          <Typography>
            Deseja realmente excluir o curso {cursoParaExcluir?.nome}?
          </Typography>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={() => setCursoParaExcluir(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarExclusao}>Excluir</Button>
        </Dialog.Footer>
      </Dialog.Root>
    </Container>
  )
}
