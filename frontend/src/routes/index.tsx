import { Route, Routes } from "react-router-dom";

import MainLayout from "../Layout/MainLayout/MainLayout";
import Home from "../Pages/Home/Home";
import BuildingPage from "../Pages/BuildingPage/BuildingPage";
import NotFound from "../Pages/NotFound/NotFound";
import Alunos from "../Pages/Alunos/Alunos";
<<<<<<< HEAD
import Matriculas from "../Pages/Matriculas";
=======
import Matricula from "../Pages/Matricula/Matricula";

>>>>>>> origin/g5-sprint2-matriculas-API+View

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
                <Route path="/matricula/nova" element={<Matricula />} />
                <Route path="/cursos/lista" element={<BuildingPage />} />
                <Route path="/disciplinas/lista" element={<BuildingPage />} />
                <Route path="/matriculas" element={<Matriculas />} />
            </Route>
        </Routes>
    )
}