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

export function AppRoutes() {
    return (
        <Routes>
            {/* ROTAS PÚBLICAS */}
            <Route path="/login" element={<Login />} />

            {/* ROTAS PRIVADAS (Protegidas pelo PrivateRoute) */}
            {/* Se não tiver token, nada aqui dentro carrega */}
            <Route 
                element={
                    <PrivateRoute>
                        <MainLayout />
                    </PrivateRoute>
                }
            >
                <Route path="/" element={<Home />}/>
                <Route path="/home" element={<Home />}/>
                <Route path="/tarefas/lista" element={<BuildingPage />} />
                <Route path="/professores/lista" element={<BuildingPage />} />
                <Route path="/usuarios/lista" element={<Cadastro />} />
                <Route path="/alunos/lista" element={<Alunos />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/cursos/lista" element={<BuildingPage />} />
                <Route path="/disciplinas/lista" element={<BuildingPage />} />                
                <Route path="*" element={<NotFound />} />
                <Route path="/alunos/cadastro" element={<CadastroAlunos />}/>
                <Route path="alunos/:matricula" element={<EditFormCadastroAluno />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}