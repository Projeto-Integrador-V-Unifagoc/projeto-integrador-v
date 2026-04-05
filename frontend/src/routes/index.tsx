import { Route, Routes } from "react-router-dom";

import MainLayout from "../Layout/MainLayout/MainLayout";
import Home from "../Pages/Home/Home";
import BuildingPage from "../Pages/BuildingPage/BuildingPage";
import NotFound from "../Pages/NotFound/NotFound";
import Alunos from "../Pages/Alunos/Alunos";

// Importe as suas telas aqui
import { Cadastro } from "../Pages/Cadastro/cadastro";
// import { Login } from "../Pages/Login";

export function AppRoutes() {
    return (
        <Routes>
            {/* ROTAS PÚBLICAS (Sem o Layout do sistema) */}
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/login" element={<div>Tela de Login (Em breve)</div>} />

            {/* ROTAS PRIVADAS (Com o Layout do sistema) */}
            <Route element={<MainLayout />}>
                <Route path="/" element={<Home />}/>
                <Route path="/home" element={<Home />}/>
                <Route path="/tarefas/lista" element={<BuildingPage />} />
                <Route path="/professores/lista" element={<BuildingPage />} />
                <Route path="/alunos/lista" element={<Alunos />} />
                <Route path="/cursos/lista" element={<BuildingPage />} />
                <Route path="/disciplinas/lista" element={<BuildingPage />} />
                
                {/* Rota 404 dentro do layout para manter o menu visível no erro */}
                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    )
}