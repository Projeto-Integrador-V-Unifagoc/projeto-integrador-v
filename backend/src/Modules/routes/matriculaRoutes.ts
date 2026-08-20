import { Router } from "express";
import { MatriculaController } from "../modulo-matricula/controller/MatriculaController.js";
import { autenticar } from "../../middlewares/autenticacao.js";
import { soSecretaria } from "../../middlewares/autorizacao.js";

const controller = new MatriculaController();
export const matriculaRouter = Router();

matriculaRouter.use(autenticar, soSecretaria);

matriculaRouter.get("/turmas/disponiveis/:cursoId", (req, res) => controller.listarTurmasDisponiveis(req, res));
matriculaRouter.get("/matriculas", (req, res) => controller.listarTodas(req, res));
matriculaRouter.get("/matriculas/status/:matricula", (req, res) => controller.consultarStatus(req, res));
matriculaRouter.get("/matriculas/aluno/:alunoId", (req, res) => controller.listarPorAluno(req, res));
matriculaRouter.post("/matriculas", (req, res) => controller.criarMatricula(req, res));
matriculaRouter.patch("/matriculas/:id/cancelar", (req, res) => controller.cancelar(req, res));
matriculaRouter.patch("/matriculas/:id/status", (req, res) => controller.atualizarStatus(req, res));
