import { Route, Routes } from "react-router-dom";

import MainLayout from "../Layout/MainLayout/MainLayout";
import Home from "../Pages/Home/Home";
import BuildingPage from "../Pages/BuildingPage/BuildingPage";
import NotFound from "../Pages/NotFound/NotFound";
import Alunos from "../Pages/Alunos/Alunos";
import CadastroAlunos from "../Pages/Alunos/CadastroAlunos";
import EditFormCadastroAluno from "../Pages/Alunos/EditFormCadastroAluno";
import Cursos from "../Pages/Cursos/Cursos";
import CadastroCursos from "../Pages/Cursos/CadastroCursos";
import EditCurso from "../Pages/Cursos/EditCurso";
import Disciplinas from "../Pages/Disciplinas/Disciplinas";
import CadastroDisciplinas from "../Pages/Disciplinas/CadastroDisciplinas";
import EditDisciplina from "../Pages/Disciplinas/EditDisciplina";


import Avaliacoes from "../Pages/Avaliacoes/Avaliacoes";
import Professores from "../Pages/Professores/Professores";
import CadastroProfessores from "../Pages/Professores/Cadastro";
import NovaMatricula from "../Pages/Matricula/NovaMatricula";
import Documentos from "../Pages/Documentos/Documentos";
import Inscricao from "../Pages/Inscricao/Inscricao";

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/inscricao" element={<Inscricao />} />
            <Route element={<MainLayout />}>
                <Route path="*" element={<NotFound />} />
                <Route path="/" element={<Home />}/>
                <Route path="/home" element={<Home />}/>
                <Route path="/tarefas/lista" element={<BuildingPage />} />
                <Route path="/professores/lista" element={<Professores />} />
                <Route path="/professores/cadastro" element={<CadastroProfessores />} />
                <Route path="/alunos/lista" element={<Alunos />} />
                <Route path="/cursos/lista" element={<Cursos />} />
                <Route path="/disciplinas/lista" element={<Disciplinas />} />
                <Route path="/alunos/cadastro" element={<CadastroAlunos />}/>
                <Route path="/cursos/cadastro" element={<CadastroCursos />}/>
                <Route path="/disciplinas/cadastro" element={<CadastroDisciplinas />}/>
                <Route path="alunos/:matricula" element={<EditFormCadastroAluno />} />
                <Route path="cursos/:id" element={<EditCurso />} />
                <Route path="disciplinas/:id" element={<EditDisciplina />} />
                <Route path="/avaliacoes/lista" element={<Avaliacoes />} />
                <Route path="/matricula/nova" element={<NovaMatricula />} />
                <Route path="/documentos/envio" element={<Documentos />} />
                <Route path="/cursos/lista" element={<BuildingPage />} />
                <Route path="/disciplinas/lista" element={<BuildingPage />} />

            </Route>
        </Routes>
    )
}
