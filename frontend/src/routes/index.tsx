import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../Layout/MainLayout/MainLayout";
import Home from "../Pages/Home/Home";
import BuildingPage from "../Pages/BuildingPage/BuildingPage";
import NotFound from "../Pages/NotFound/NotFound";
import Alunos from "../Pages/Alunos/Alunos";

import { Cadastro } from "../Pages/Cadastro/cadastro";
import { Login } from "../Pages/Login/Login";
import { PrivateRoute } from "../components/PrivateRoute";

export function AppRoutes() {
    return (
        <Routes>
            {/* ROTAS PÚBLICAS */}
            <Route path="/cadastro" element={<Cadastro />} />
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
                <Route path="/alunos/lista" element={<Alunos />} />
                <Route path="/cursos/lista" element={<BuildingPage />} />
                <Route path="/disciplinas/lista" element={<BuildingPage />} />
                
                <Route path="*" element={<NotFound />} />
            </Route>

            {/* Redirecionamento de segurança caso o cara caia numa rota fantasma fora do layout */}
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}