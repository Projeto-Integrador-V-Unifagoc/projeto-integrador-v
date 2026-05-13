import { useState, useEffect } from "react";

import { IconButton, Stack, useMediaQuery, useTheme } from "@mui/material";

import SearchTextField from "../../components/SearchTextField/SearchTextField";
import DataTable from "../../components/DataTable/DataTable";
import { MobileCard } from "../../components/MobileCard";
import Container from "../../components/Container";


import type { AlunoRequest, AlunoView } from "../../models/aluno-model";
import { useAluno } from "../../hooks/use-aluno";
import { useNavigate } from "react-router-dom";
import type { GridColDef } from "@mui/x-data-grid";
import { ClipboardList, Pencil } from "lucide-react";

export default function Alunos() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const [alunos, setAlunos] = useState<AlunoView[]>([])
  const { listarAlunos, buscarAlunoPorMatricula, carregando } = useAluno()
  const navigate = useNavigate()


  const columns: GridColDef<AlunoView>[] = [
    {
      field: "matricula",
      headerName: "Matricula",
      width: 90
    },
    {
      field: "nome",
      headerName: "Nome",
      flex: 1
    },
    {
      field: "cpf",
      headerName: "CPF",
      flex: 1
    },
    {
      field: "logradouro",
      headerName: "Logradouro",
      flex: 1
    },
    {
      field: "bairro",
      headerName: "Bairro",
      flex: 1
    },
    {
      field: "cidade",
      headerName: "Cidade",
      flex: 1
    },
    {
      field: "estado",
      headerName: "Estado",
      flex: 1
    },
    {
      field: "cep",
      headerName: "Cep",
      flex: 1
    },
    {
      field: "periodo",
      headerName: "Período",
      flex: 1
    },
    {
      field: "id",
      headerName: "Ações",
      flex: 1,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={() => navigate(`/alunos/editar-aluno/${params.row.matricula}`)}
            color="primary"
          >
            <Pencil size={20} />
          </IconButton>
          <IconButton
            onClick={() => navigate(`/alunos/ficha-do-aluno/${params.row.id}`)}
            color="primary"
          >
            <ClipboardList size={20} />
          </IconButton>
        </Stack>
      )
    },
  ];

  useEffect(() => {
    async function buscarAlunos() {
      const data = await listarAlunos()
      const alunosMapeados = data.map((aluno: AlunoRequest) => ({
        id: aluno.id,
        matricula: aluno.matricula,
        nome: aluno.pessoa?.nome,
        email: aluno.usuario?.email,
        cpf: aluno.pessoa?.cpf,
        logradouro: aluno.pessoa?.logradouro,
        bairro: aluno.pessoa?.bairro,
        numero: aluno.pessoa?.numero,
        cidade: aluno.pessoa?.cidade?.nome,
        estado: aluno.pessoa?.estado,
        cep: aluno.pessoa?.cep,
        periodo: aluno.periodo,
      }))
      setAlunos(alunosMapeados)
    }
    buscarAlunos()
  }, [])



  return (
    <Container>
      <SearchTextField>Alunos</SearchTextField>

      {isMobile ? (
        alunos.map((aluno) => (
          <MobileCard.Root
            onClick={() => navigate(`/alunos/${aluno.matricula}`)}
            key={aluno.id}
          >
            <MobileCard.Header
              matricula={aluno.matricula}
            />
            <MobileCard.Content
              nome={aluno.nome}
              cpf={aluno.cpf}
              logradouro={aluno.logradouro}
              bairro={aluno.bairro}
              numero={aluno.numero}
              cidade={aluno.cidade}
              uf={aluno.estado}
              cep={aluno.cep}
              telefone={'32 9 9829-1861'}
              periodo={aluno.periodo}
            />

            <MobileCard.Footer />
          </MobileCard.Root>
        ))
      ) : (
        <DataTable columns={columns} rows={alunos} loading={carregando} />
      )}
    </Container>
  );

}