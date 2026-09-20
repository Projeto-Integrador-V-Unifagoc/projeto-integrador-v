import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import EditFormCadastroAluno from "../Pages/Alunos/EditFormCadastroAluno";
import Perfil from "../Pages/Perfil/Perfil";
import Cadastro from "../Pages/Usuario/Usuario";
import { Login } from "../Pages/Login/Login";
import EsqueceuSenha from "../Pages/EsqueceuSenha/EsqueceuSenha";
import RedefinirSenha from "../Pages/RedefinirSenha/RedefinirSenha"
import { PrivateRoute } from "../components/PrivateRoute";
import Relatorios from "../Pages/Relatorios/Relatorios";

import BuildingPage from "../Pages/BuildingPage/BuildingPage";
import CadastroAlunos from "../Pages/Alunos/CadastroAlunos";
import MainLayout from "../Layout/MainLayout/MainLayout";
import FichaAluno from "../Pages/Alunos/FichaAluno";
import NotFound from "../Pages/NotFound/NotFound";
import Home from "../Pages/Home/Home";
import Alunos from "../Pages/Alunos/Alunos";
import StatusMatricula from "../Pages/Status/Status";
import StatusMatriculaLista from "../Pages/Status/StatusListagem";

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
import LancamentoNotas from "../Pages/Notas/LancamentoNotas";
import MinhasNotas from "../Pages/Notas/MinhasNotas";
import Matriculas from "../Pages/Matricula/Matriculas";
import Documentos from "../Pages/Documentos/Documentos";
import Inscricao from "../Pages/Inscricao/Inscricao";
import ReenviarDocumentos from "../Pages/Inscricao/ReenviarDocumentos";
import LayoutPublico from "../Pages/LandingPage/LayoutPublico";
import LandingPage from "../Pages/LandingPage/LandingPage";
import Sobre from "../Pages/LandingPage/Sobre";
import CursosPublico from "../Pages/LandingPage/CursosPublico";
import NoticiasPublicas from "../Pages/LandingPage/Noticias";
import NoticiaDetalhe from "../Pages/LandingPage/NoticiaDetalhe";
import GaleriaPublica from "../Pages/LandingPage/Galeria";
import AlbumDetalhe from "../Pages/LandingPage/AlbumDetalhe";
import ContatoPublico from "../Pages/LandingPage/Contato";
import PainelLayout from "../Pages/Painel/PainelLayout";
import PainelLogin from "../Pages/Painel/PainelLogin";
import PainelDashboard from "../Pages/Painel/PainelDashboard";
import PainelBanners from "../Pages/Painel/PainelBanners";
import PainelNoticias from "../Pages/Painel/PainelNoticias";
import PainelGaleria from "../Pages/Painel/PainelGaleria";
import PainelCursos from "../Pages/Painel/PainelCursos";
import PainelMenu from "../Pages/Painel/PainelMenu";
import PainelUsuarios from "../Pages/Painel/PainelUsuarios";
import ManualDoSistema from "../Pages/ManualDoSistema/ManualDoSistema";
import ManualUsuarioAutenticacao from "../Pages/ManualDoSistema/components/ManualUsuarioAutenticacao/ManualUsuarioAutenticacao";
import ManualAlunos from "../Pages/ManualDoSistema/components/ManualAlunos/ManualAlunos";
import ManualStatus from "../Pages/ManualDoSistema/components/ManualStatus/ManualStatus";
import ManualCursos from "../Pages/ManualDoSistema/components/ManualCursos/ManualCursos";
import ManualDisciplinas from "../Pages/ManualDoSistema/components/ManualDisciplinas/ManualDisciplinas";
import ManualPeriodosLetivos from "../Pages/ManualDoSistema/components/ManualPeriodosLetivos/ManualPeriodosLetivos";
import ManualTurmas from "../Pages/ManualDoSistema/components/ManualTurmas/ManualTurmas";

const ACESSO_ADMIN = ["secretaria", "administrador"];
const ACESSO_PROFESSOR = ["secretaria", "administrador", "professor"];
const ACESSO_TODOS = ["secretaria", "administrador", "professor", "aluno"];

function RouteByRole({
  children,
  perfisPermitidos,
}: {
  children: ReactNode;
  perfisPermitidos: string[];
}) {
  const usuarioStorage = localStorage.getItem("@UniEduca:user");

  if (!usuarioStorage) {
    return <Navigate to="/login" replace />;
  }

  let usuario;

  try {
    usuario = JSON.parse(usuarioStorage);
  } catch {
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
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
        <Route element={<LayoutPublico />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/cursos" element={<CursosPublico />} />
          <Route path="/noticias" element={<NoticiasPublicas />} />
          <Route path="/noticias/:slug" element={<NoticiaDetalhe />} />
          <Route path="/galeria" element={<GaleriaPublica />} />
          <Route path="/galeria/:slug" element={<AlbumDetalhe />} />
          <Route path="/contato" element={<ContatoPublico />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/painel/login" element={<PainelLogin />} />
        <Route path="/painel" element={<PainelLayout />}>
          <Route index element={<PainelDashboard />} />
          <Route path="dashboard" element={<PainelDashboard />} />
          <Route path="banners" element={<PainelBanners />} />
          <Route path="noticias" element={<PainelNoticias />} />
          <Route path="galeria" element={<PainelGaleria />} />
          <Route path="cursos" element={<PainelCursos />} />
          <Route path="menu" element={<PainelMenu />} />
          <Route path="usuarios" element={<PainelUsuarios />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/inscricao" element={<Inscricao />} />
        <Route path="/reenviar-documentos" element={<ReenviarDocumentos />} />
        <Route path="/esqueceu-senha" element={<EsqueceuSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        <Route element={ <PrivateRoute><MainLayout /></PrivateRoute> }>
        <Route path="/manual-do-sistema" element={<ManualDoSistema />} />
        <Route path="/manual-do-sistema/usuarios-e-autenticacao" element={<ManualUsuarioAutenticacao />} />
        <Route path="/manual-do-sistema/alunos" element={<ManualAlunos />} />
        <Route path="/manual-do-sistema/status" element={<ManualStatus />} />
        <Route path="/manual-do-sistema/cursos" element={<ManualCursos />} />
        <Route path="/manual-do-sistema/disciplinas" element={<ManualDisciplinas />} />
        <Route path="/manual-do-sistema/periodos-letivos" element={<ManualPeriodosLetivos />} />
        <Route path="/manual-do-sistema/turmas" element={<ManualTurmas />} />

        <Route path="/home" element={<Home />} />
        <Route path="/perfil" element={<Perfil />} />

        <Route
          path="/tarefas/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <BuildingPage />
            </RouteByRole>
          }
        />

        <Route
          path="/usuarios/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Cadastro />
            </RouteByRole>
          }
        />

        <Route
          path="/cadastro"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Cadastro />
            </RouteByRole>
          }
        />

        <Route
          path="/professores/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Professores />
            </RouteByRole>
          }
        />

        <Route
          path="/professores/cadastro"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <CadastroProfessores />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Alunos />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/cadastro"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <CadastroAlunos />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/:matricula"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <EditFormCadastroAluno />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/editar/:id"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <EditFormCadastroAluno />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/editar-aluno/:matricula"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <EditFormCadastroAluno />
            </RouteByRole>
          }
        />

        <Route
          path="/alunos/ficha-do-aluno/:id"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <FichaAluno />
            </RouteByRole>
          }
        />

        <Route
          path="/avaliacoes/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_PROFESSOR}>
              <Avaliacoes />
            </RouteByRole>
          }
        />

        <Route
          path="/notas/lancamento"
          element={
            <RouteByRole perfisPermitidos={ACESSO_PROFESSOR}>
              <LancamentoNotas />
            </RouteByRole>
          }
        />

        <Route
          path="/minhas-notas"
          element={
            <RouteByRole perfisPermitidos={["aluno"]}>
              <MinhasNotas />
            </RouteByRole>
          }
        />

        <Route
          path="/cursos/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Cursos />
            </RouteByRole>
          }
        />

        <Route
          path="/cursos/cadastro"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <CadastroCursos />
            </RouteByRole>
          }
        />

        <Route
          path="/cursos/:id"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <EditCurso />
            </RouteByRole>
          }
        />

        <Route
          path="/cursos/:id/matriz-curricular"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <MatrizCurricularCurso />
            </RouteByRole>
          }
        />

        <Route
          path="/disciplinas/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Disciplinas />
            </RouteByRole>
          }
        />

        <Route
          path="/disciplinas/cadastro"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <CadastroDisciplinas />
            </RouteByRole>
          }
        />

        <Route
          path="/disciplinas/:id"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <EditDisciplina />
            </RouteByRole>
          }
        />

        <Route
          path="/periodos-letivos/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <PeriodosLetivos />
            </RouteByRole>
          }
        />

        <Route
          path="/periodos-letivos/cadastro"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <CadastroPeriodosLetivos />
            </RouteByRole>
          }
        />

        <Route
          path="/periodos-letivos/:id"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <EditPeriodoLetivo />
            </RouteByRole>
          }
        />

        <Route
          path="/turmas/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Turmas />
            </RouteByRole>
          }
        />

        <Route
          path="/turmas/cadastro"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <CadastroTurmas />
            </RouteByRole>
          }
        />

        <Route
          path="/turmas/:id"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <DetalheTurma />
            </RouteByRole>
          }
        />

        <Route
          path="/frequencias/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_PROFESSOR}>
              <Frequencia />
            </RouteByRole>
          }
        />
        <Route
          path="/minha-frequencia"
          element={
            <RouteByRole perfisPermitidos={["aluno"]}>
              <Frequencia />
            </RouteByRole>
          }
        />

        <Route
          path="/matricula/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Matriculas />
            </RouteByRole>
          }
        />

        <Route
          path="/documentos/envio"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <Documentos />
            </RouteByRole>
          }
        />

        <Route
          path="/statusLista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <StatusMatriculaLista />
            </RouteByRole>
          }
        />

        <Route
          path="/statusCadastro"
          element={
            <RouteByRole perfisPermitidos={ACESSO_ADMIN}>
              <StatusMatricula />
            </RouteByRole>
          }
        />

        <Route
          path="/relatorios/lista"
          element={
            <RouteByRole perfisPermitidos={ACESSO_TODOS}>
              <Relatorios />
            </RouteByRole>
          }
        />

        <Route
          path="/building"
          element={
            <RouteByRole perfisPermitidos={ACESSO_TODOS}>
              <BuildingPage />
            </RouteByRole>
          }
        />
      </Route>

    </Routes>
  );
}
