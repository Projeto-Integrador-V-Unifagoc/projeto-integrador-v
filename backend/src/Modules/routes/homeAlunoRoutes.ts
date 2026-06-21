import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao.js";
import { HomeAlunoController } from "../home-aluno/controller/HomeAlunoController.js";

const controller = new HomeAlunoController();
export const homeAlunoRouter = Router();

homeAlunoRouter.use(autenticar);

// Aluno (deriva o aluno do JWT)
homeAlunoRouter.get("/me/disciplinas", controller.minhasDisciplinas);
homeAlunoRouter.get("/me/tarefas", controller.minhasTarefas);
