//use do react
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

//material icon
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";

//service
import { professorApi } from "../../services/professor-api";

//model
import type { Professor } from "../../models/professor-model";



export default function Professores(){    

    const pgCadastro = useNavigate()
    const[professores, setProfessores] = useState<Professor[]>([])

    useEffect(() => {
        
        const buscarProfessores = async() => {
            const data = await professorApi.listar()
            setProfessores(data)
        }

        buscarProfessores()

    }, [])

    const columns = [
        { field: "id", headerName: "Id", width: 90,  },
        { field: "nome", headerName: "Nome", flex: 1 },
        { field: "curso", headerName: "Curso", flex: 1 },
        { field: "email", headerName: "Email", flex: 1},
        { field: "cpf", headerName: "Cpf", flex: 1},
        { field: "faculdade", headerName: "Faculdade", flex: 1},
    ];

    const abrirPaginaCadastro = () => {
        pgCadastro('/professores/cadastro')
    }

    return (
    <>  
        <Container>
            <SearchTextField buttonOnClick={abrirPaginaCadastro}>
                Professores
            </SearchTextField>        
            <DataTable columns={columns} rows={professores}/>
        </Container>  
     </>
    )
}

