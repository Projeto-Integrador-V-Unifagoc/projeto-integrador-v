import { Router } from "express";
import { FrequenciaController } from "../frequencia/controller/FrequenciaController";

const frequenciaController = new FrequenciaController();
export const frequenciaRouter = Router();

frequenciaRouter.get("/opcoes", (req, res) => frequenciaController.listarOpcoes(req, res));
frequenciaRouter.get("/chamada", (req, res) => frequenciaController.obterChamada(req, res));
frequenciaRouter.get("/relatorio", (req, res) => frequenciaController.gerarRelatorio(req, res));
frequenciaRouter.post("/", (req, res) => frequenciaController.registrarFrequencia(req, res));
frequenciaRouter.get("/aluno/:alunoId", (req, res) => frequenciaController.consultarAluno(req, res));
frequenciaRouter.get("/turma/:turmaId", (req, res) => frequenciaController.consultarTurma(req, res));
