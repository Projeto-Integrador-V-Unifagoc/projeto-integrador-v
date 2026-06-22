import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { FrequenciaController } from "../frequencia/controller/FrequenciaController";

const controller = new FrequenciaController();
export const frequenciaRouter = Router();

frequenciaRouter.use(autenticar);
frequenciaRouter.get("/opcoes", controller.listarOpcoes);
frequenciaRouter.get("/chamada", controller.obterChamada);
frequenciaRouter.get("/relatorio", controller.relatorio);
frequenciaRouter.get("/minha", controller.minhaFrequencia);
frequenciaRouter.put("/chamada", controller.salvarChamada);
frequenciaRouter.post("/", controller.salvarChamada);
frequenciaRouter.get("/aluno/:alunoId", controller.consultarAluno);
frequenciaRouter.get("/turma/:turmaId", controller.consultarTurma);
frequenciaRouter.post("/:id/justificativa", controller.justificar);
