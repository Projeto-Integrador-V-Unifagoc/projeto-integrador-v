import axios from "axios";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import { useState, useEffect } from "react";

export default function Alunos() {

  const columns = [
    { field: "matricula", headerName: "Matricula", width: 90 },
    { field: "nome", headerName: "Nome", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
  ];

  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState<boolean>(true)

  useEffect(() => {
  axios.get("http://localhost:3000/alunos")
    .then((response) => {
      const dados = response.data.map((aluno) => ({
        id: aluno.matricula,
        matricula: aluno.matricula,
        nome: aluno.pessoa?.nome,
        email: aluno.usuario?.email
      }));

      setAlunos(dados);
    })
    .catch((err) => console.log(err))
    .finally(() => setCarregando(false))
}, []);

  return (
    <Container>
      <SearchTextField>Alunos</SearchTextField>
      <DataTable columns={columns} rows={alunos} loading={carregando}/>
    </Container>
  );
}