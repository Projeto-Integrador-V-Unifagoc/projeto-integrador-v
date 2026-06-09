import { Navigate, Route, Routes } from "react-router-dom";

import EditFormCadastroAluno from "../Pages/Alunos/EditFormCadastroAluno";
import Perfil from "../Pages/Perfil/Perfil";
import Cadastro from "../Pages/Usuario/Usuario";
import { Login } from "../Pages/Login/Login";
import { PrivateRoute } from "../components/PrivateRoute";

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
import ManualDoSistema from "../Pages/ManualDoSistema/ManualDoSistema";
import ManualUsuarioAutenticacao from "../Pages/ManualDoSistema/components/ManualUsuarioAutenticacao/ManualUsuarioAutenticacao";

function RouteByRole({
  children,
  perfisPermitidos,
}: {
  children: any;
  perfisPermitidos: string[];
}) {
  const usuarioStorage = localStorage.getItem("@UniEduca:user");

  if (!usuarioStorage) {
    return <Navigate to="/login" replace />;
  }

  let usuario;

  try {
    usuario = JSON.parse(usuarioStorage);
  } catch (error) {
    localStorage.removeItem("@UniEduca:user");
    localStorage.removeItem("@UniEduca:token");
    return <Navigate to="/login" replace />;
  }

  const tipoUsuario = String(usuario?.tipo_usuario || "")
    .trim()
    .toLowerCase();

  if (!tipoUsuario) {
    return <Navigate to="/login" replace />;
  }

  if (!perfisPermitidos.includes(tipoUsuario)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/inscricao" element={<Inscricao />} />

      <Route
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route path="/manual-do-sistema" element={<ManualDoSistema />}/>
        <Route path="/manual-do-sistema/usuarios-e-autenticacao" element={<ManualUsuarioAutenticacao />}/>

        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/tarefas/lista" element={<BuildingPage />} />

        <Route
          path="/usuarios/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <Cadastro />
            </RouteByRole>
          }
        />

        <Route
          path="/cadastro"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <Cadastro />
            </RouteByRole>
          }
        />

        <Route
          path="/professores/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <Professores />
            </RouteByRole>
          }
        />

        <Route
          path="/professores/cadastro"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <CadastroProfessores />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor"]}>
              <Alunos />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/cadastro"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <CadastroAlunos />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/:matricula"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor"]}>
              <EditFormCadastroAluno />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/editar/:id"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <EditFormCadastroAluno />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/editar-aluno/:matricula"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <EditFormCadastroAluno />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/ficha-do-aluno/:id"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor", "aluno"]}>
              <FichaAluno />
            </RouteByRole>
          }
        />

        <Route
          path="/avaliacoes/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor", "aluno"]}>
              <Avaliacoes />
            </RouteByRole>
          }
        />

        <Route
          path="/cursos/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor", "aluno"]}>
              <Cursos />
            </RouteByRole>
          }
        />

        <Route
          path="/cursos/cadastro"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <CadastroCursos />
            </RouteByRole>
          }
        />

        <Route
          path="/cursos/:id"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <EditCurso />
            </RouteByRole>
          }
        />

        <Route
          path="/cursos/:id/matriz-curricular"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor"]}>
              <MatrizCurricularCurso />
            </RouteByRole>
          }
        />

        <Route
          path="/disciplinas/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor", "aluno"]}>
              <Disciplinas />
            </RouteByRole>
          }
        />

        <Route
          path="/disciplinas/cadastro"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <CadastroDisciplinas />
            </RouteByRole>
          }
        />

        <Route
          path="/disciplinas/:id"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <EditDisciplina />
            </RouteByRole>
          }
        />

        <Route
          path="/periodos-letivos/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <PeriodosLetivos />
            </RouteByRole>
          }
        />

        <Route
          path="/periodos-letivos/cadastro"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <CadastroPeriodosLetivos />
            </RouteByRole>
          }
        />

        <Route
          path="/periodos-letivos/:id"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <EditPeriodoLetivo />
            </RouteByRole>
          }
        />

        <Route
          path="/turmas/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <Turmas />
            </RouteByRole>
          }
        />

        <Route
          path="/turmas/cadastro"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <CadastroTurmas />
            </RouteByRole>
          }
        />

        <Route
          path="/turmas/:id"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor"]}>
              <DetalheTurma />
            </RouteByRole>
          }
        />

        <Route
          path="/frequencias/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor"]}>
              <Frequencia />
            </RouteByRole>
          }
        />

        <Route
          path="/matricula/nova"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <NovaMatricula />
            </RouteByRole>
          }
        />

        <Route
          path="/documentos/envio"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor", "aluno"]}>
              <Documentos />
            </RouteByRole>
          }
        />

        <Route
          path="/status"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor", "aluno"]}>
              <StatusMatricula />
            </RouteByRole>
          }
        />

        <Route
          path="/building"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor", "aluno"]}>
              <BuildingPage />
            </RouteByRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}