import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { HomeProfessorController } from "../home-professor/controller/HomeProfessorController";

const controller = new HomeProfessorController();
export const homeProfessorRouter = Router();
homeProfessorRouter.use(autenticar);
homeProfessorRouter.get("/me/professor/dashboard", controller.dashboard);
homeProfessorRouter.get("/me/professor/turmas/:turmaDisciplinaId", controller.detalhe);
homeProfessorRouter.get("/me/professor/turmas/:turmaDisciplinaId/alunos/:alunoId", controller.detalheAluno);
