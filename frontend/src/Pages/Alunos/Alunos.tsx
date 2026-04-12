import { useState, useEffect } from "react";

import { useMediaQuery, useTheme } from "@mui/material";

import SearchTextField from "../../components/SearchTextField/SearchTextField";
import DataTable from "../../components/DataTable/DataTable";
import { MobileCard } from "../../components/MobileCard";
import Container from "../../components/Container";


import type { AlunoRequest, AlunoView } from "../../models/aluno-model";
import { useAluno } from "../../hooks/use-aluno";

export default function Alunos() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const [alunos, setAlunos] = useState<AlunoView[]>([])
  const { listarAlunos, carregando } = useAluno()

  const columns = [
    { field: "matricula", headerName: "Matricula", width: 90 },
    { field: "nome", headerName: "Nome", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
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