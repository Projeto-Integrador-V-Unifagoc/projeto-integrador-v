import axios from "axios";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import { useState, useEffect } from "react";

export default function Alunos() {

  const columns = [
    { field: "id", headerName: "Id", width: 90 },
    { field: "nome", headerName: "Nome", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
  ];

  const [alunos, setAlunos] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8080/alunos")
      .then((response) => {
        setAlunos(response.data);
      })
      .catch((err) => console.log(err));
  }, []); 

  return (
    <Container>
      <SearchTextField>Alunos</SearchTextField>
      <DataTable columns={columns} rows={alunos} />
    </Container>
  );
}