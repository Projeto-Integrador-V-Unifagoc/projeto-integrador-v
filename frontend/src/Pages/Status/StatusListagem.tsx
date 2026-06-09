import { useEffect, useState } from "react"
import { Box, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material"
import type { GridColDef } from "@mui/x-data-grid"
import { useNavigate } from "react-router-dom"
import { Pencil } from "lucide-react"
import Container from "../../components/Container"
import DataTable from "../../components/DataTable/DataTable"
import Button from "../../components/Button"
import { Card } from "../../components/Card"
import { statusApi, type StatusMatriculaCurso, type StatusMatriculaDisciplina } from "../../services/status-api"

interface StatusView {
  id: string
  descricao: string
}

export default function StatusMatriculaLista() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const navigate = useNavigate()

  const [statusDisciplinas, setStatusDisciplinas] = useState<StatusMatriculaDisciplina[]>([])
  const [statusCursos, setStatusCursos] = useState<StatusMatriculaCurso[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void carregarStatus()
  }, [])

  async function carregarStatus() {
    setLoading(true)

    try {
      const [disciplinas, cursos] = await Promise.all([
        statusApi.listarStatusMatriculaDisciplina(),
        statusApi.listarStatusMatriculaCurso(),
      ])

      setStatusDisciplinas(disciplinas)
      setStatusCursos(cursos)
    } finally {
      setLoading(false)
    }
  }

  const columns = (tipo: "disciplina" | "matricula"): GridColDef<StatusView>[] => [
    { field: "id", headerName: "ID", width: 120 },
    { field: "descricao", headerName: "Descrição", flex: 1, minWidth: 240 },
    {
      field: "acoes",
      headerName: "Editar",
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          color="primary"
          size="small"
          onClick={() => navigate(`/statusCadastro?tipo=${tipo}&id=${params.row.id}`)}
        >
          <Pencil size={18} />
        </IconButton>
      ),
    },
  ]

  return (
    <Container>
      <Stack gap={2}>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: isMobile ? "column" : "row",
            gap: 2,
          }}
        >
          <Stack>
            <Typography variant="h5">Status de matricula</Typography>
            <Typography color="text.secondary">Lista de status de disciplina e de curso.</Typography>
          </Stack>

          <Button variant="contained" style={{ height: "45px", width: "80px" }} onClick={() => navigate("/statusCadastro")}>Cadastrar status</Button>
        </Box>

        <Card.Root>
          <Card.Header>
            <Card.Title>Status de Disciplina</Card.Title>
          </Card.Header>
          <Card.Content>
            <DataTable columns={columns("disciplina")} rows={statusDisciplinas} loading={loading} />
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>Status de Curso</Card.Title>
          </Card.Header>
          <Card.Content>
            <DataTable columns={columns("matricula")} rows={statusCursos} loading={loading} />
          </Card.Content>
        </Card.Root>
      </Stack>
    </Container>
  )
}
