import { Route, Routes } from "react-router-dom";

import EditFormCadastroAluno from "../Pages/Alunos/EditFormCadastroAluno";
import BuildingPage from "../Pages/BuildingPage/BuildingPage";
import CadastroAlunos from "../Pages/Alunos/CadastroAlunos";
import MainLayout from "../Layout/MainLayout/MainLayout";
import FichaAluno from "../Pages/Alunos/FichaAluno";
import NotFound from "../Pages/NotFound/NotFound";
import Home from "../Pages/Home/Home";
import Alunos from "../Pages/Alunos/Alunos";
import StatusMatricula from "../Pages/Status/Status";



export function AppRoutes() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="*" element={<NotFound />} />
                <Route path="/" element={<Home />}/>
                <Route path="/home" element={<Home />}/>
                <Route path="/tarefas/lista" element={<BuildingPage />} />
                <Route path="/professores/lista" element={<BuildingPage />} />
                <Route path="/alunos/lista" element={<Alunos />} />
                <Route path="/cursos/lista" element={<BuildingPage />} />
                <Route path="/disciplinas/lista" element={<BuildingPage />} />
                <Route path="/alunos/cadastro" element={<CadastroAlunos />}/>
                <Route path="alunos/ficha-do-aluno/:id" element={<FichaAluno />} />
                <Route path="alunos/editar-aluno/:matricula" element={<EditFormCadastroAluno />} />
                <Route path="alunos/:matricula" element={<EditFormCadastroAluno />} />
                <Route path="/status" element={<StatusMatricula />} />
            </Route>
        </Routes>
    )
}
