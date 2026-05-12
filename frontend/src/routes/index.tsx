import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../Layout/MainLayout/MainLayout";
import Home from "../Pages/Home/Home";
import BuildingPage from "../Pages/BuildingPage/BuildingPage";
import NotFound from "../Pages/NotFound/NotFound";
import Alunos from "../Pages/Alunos/Alunos";
import CadastroAlunos from "../Pages/Alunos/CadastroAlunos";
import EditFormCadastroAluno from "../Pages/Alunos/EditFormCadastroAluno";
import Perfil from "../Pages/Perfil/Perfil";
import Cadastro from "../Pages/Usuario/Usuario";
import { Login } from "../Pages/Login/Login";
import { PrivateRoute } from "../components/PrivateRoute";
import Avaliacoes from "../Pages/Avaliacoes/Avaliacoes";
import Professores from "../Pages/Professores/Professores";
import CadastroProfessores from "../Pages/Professores/Cadastro";

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

  if (!usuario?.tipo_usuario) {
    return <Navigate to="/login" replace />;
  }

  if (!perfisPermitidos.includes(usuario.tipo_usuario)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
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
          path="/alunos/editar/:id"
          element={
            <RouteByRole perfisPermitidos={["secretaria"]}>
              <EditFormCadastroAluno />
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
              <BuildingPage />
            </RouteByRole>
          }
        />

        <Route
          path="/disciplinas/lista"
          element={
            <RouteByRole perfisPermitidos={["secretaria", "professor", "aluno"]}>
              <BuildingPage />
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