import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";

export default function Alunos() {

const columns = [
  { field: "id", headerName: "Id", width: 90,  },
  { field: "nome", headerName: "Nome", flex: 1 },
  { field: "curso", headerName: "Curso", flex: 1 },
];

const rows = [
  { id: 1, nome: "João Pedro Sutana Furiate", curso: "Direito" },
  { id: 2, nome: "João Pedro Vidal", curso: "Nutrição" },
  { id: 3, nome: "Juan Pablo", curso: "Fisioterapia" },
  { id: 4, nome: "Kaio Henrique Teixeira", curso: "Ciência da Computação" },
  { id: 5, nome: "Renato Miranda Imperatori", curso: "Educação Física" },
  { id: 6, nome: "Savio Barbosa Freitas", curso: "Medicina" },

];

    return (
      <Container>
        <SearchTextField >Alunos</SearchTextField>
        <DataTable columns={columns} rows={rows}/>
      </Container>
    )
}