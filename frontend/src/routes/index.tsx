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
import Cursos from "../Pages/Cursos/Cursos";
import CadastroCursos from "../Pages/Cursos/CadastroCursos";
import EditCurso from "../Pages/Cursos/EditCurso";
import MatrizCurricularCurso from "../Pages/Cursos/MatrizCurricularCurso";
import Disciplinas from "../Pages/Disciplinas/Disciplinas";
import CadastroDisciplinas from "../Pages/Disciplinas/CadastroDisciplinas";
import EditDisciplina from "../Pages/Disciplinas/EditDisciplina";
import PeriodosLetivos from "../Pages/PeriodosLetivos/PeriodosLetivos";
import CadastroPeriodosLetivos from "../Pages/PeriodosLetivos/CadastroPeriodosLetivos";
import EditPeriodoLetivo from "../Pages/PeriodosLetivos/EditPeriodoLetivo";
import Turmas from "../Pages/Turmas/Turmas";
import CadastroTurmas from "../Pages/Turmas/CadastroTurmas";
import DetalheTurma from "../Pages/Turmas/DetalheTurma";
import Avaliacoes from "../Pages/Avaliacoes/Avaliacoes";
import Professores from "../Pages/Professores/Professores";
import CadastroProfessores from "../Pages/Professores/Cadastro";
import Frequencia from "../Pages/Frequencia/Frequencia";
import NovaMatricula from "../Pages/Matricula/NovaMatricula";
import Documentos from "../Pages/Documentos/Documentos";
import Inscricao from "../Pages/Inscricao/Inscricao";

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/inscricao" element={<Inscricao />} />
            <Route element={<MainLayout />}>
                <Route path="*" element={<NotFound />} />
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/tarefas/lista" element={<BuildingPage />} />
                <Route path="/professores/lista" element={<Professores />} />
                <Route path="/professores/cadastro" element={<CadastroProfessores />} />
                <Route path="/alunos/lista" element={<Alunos />} />
                <Route path="/cursos/lista" element={<Cursos />} />
                <Route path="/disciplinas/lista" element={<Disciplinas />} />
                <Route path="/periodos-letivos/lista" element={<PeriodosLetivos />} />
                <Route path="/turmas/lista" element={<Turmas />} />
                <Route path="/alunos/cadastro" element={<CadastroAlunos />} />
                <Route path="/cursos/cadastro" element={<CadastroCursos />} />
                <Route path="/disciplinas/cadastro" element={<CadastroDisciplinas />} />
                <Route path="/periodos-letivos/cadastro" element={<CadastroPeriodosLetivos />} />
                <Route path="/turmas/cadastro" element={<CadastroTurmas />} />
                <Route path="/avaliacoes/lista" element={<Avaliacoes />} />
                <Route path="/frequencias/lista" element={<Frequencia />} />
                <Route path="/matricula/nova" element={<NovaMatricula />} />
                <Route path="/documentos/envio" element={<Documentos />} />
                <Route path="/status" element={<StatusMatricula />} />
                <Route path="alunos/:matricula" element={<EditFormCadastroAluno />} />
                <Route path="alunos/editar-aluno/:matricula" element={<EditFormCadastroAluno />} />
                <Route path="alunos/ficha-do-aluno/:id" element={<FichaAluno />} />
                <Route path="cursos/:id" element={<EditCurso />} />
                <Route path="cursos/:id/matriz-curricular" element={<MatrizCurricularCurso />} />
                <Route path="disciplinas/:id" element={<EditDisciplina />} />
                <Route path="periodos-letivos/:id" element={<EditPeriodoLetivo />} />
                <Route path="turmas/:id" element={<DetalheTurma />} />
            </Route>
        </Routes>
    );
}
