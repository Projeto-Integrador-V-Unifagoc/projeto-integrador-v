import { Route, Routes } from "react-router-dom";

import MainLayout from "../Layout/MainLayout/MainLayout";
import Home from "../Pages/Home/Home";
import BuildingPage from "../Pages/BuildingPage/BuildingPage";
import NotFound from "../Pages/NotFound/NotFound";
import Alunos from "../Pages/Alunos/Alunos";
import CadastroAlunos from "../Pages/Alunos/CadastroAlunos";
import EditFormCadastroAluno from "../Pages/Alunos/EditFormCadastroAluno";
import Avaliacoes from "../Pages/Avaliacoes/Avaliacoes";
import Professores from "../Pages/Professores/Professores";
import CadastroProfessores from "../Pages/Professores/Cadastro";
import Frequencia from "../Pages/Frequencia/Frequencia";

export function AppRoutes() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="*" element={<NotFound />} />
                <Route path="/" element={<Home />}/>
                <Route path="/home" element={<Home />}/>
                <Route path="/tarefas/lista" element={<BuildingPage />} />
                <Route path="/professores/lista" element={<Professores />} />
                <Route path="/professores/cadastro" element={<CadastroProfessores />} />
                <Route path="/alunos/lista" element={<Alunos />} />
                <Route path="/alunos/cadastro" element={<CadastroAlunos />} />
                <Route path="/alunos/:matricula" element={<EditFormCadastroAluno />} />
                <Route path="/avaliacoes/lista" element={<Avaliacoes />} />
                <Route path="/frequencias/lista" element={<Frequencia />} />
                <Route path="/cursos/lista" element={<BuildingPage />} />
                <Route path="/disciplinas/lista" element={<BuildingPage />} />
            </Route>
        </Routes>
    )
}
