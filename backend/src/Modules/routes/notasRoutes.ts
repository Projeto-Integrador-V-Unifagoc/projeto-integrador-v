import { Router } from "express";
import { NotasController } from "../notas/controller/NotasController.js";

const notasController = new NotasController();
export const notasRouter = Router();

notasRouter.get("/", (req, res) => notasController.listar(req, res));
notasRouter.get("/aluno/:alunoId", (req, res) => notasController.listarPorAluno(req, res));
notasRouter.get("/turma/:turmaId", (req, res) => notasController.listarPorTurma(req, res));
notasRouter.get("/turma-disciplina/:turmaDisciplinaId", (req, res) =>
  notasController.listarPorTurmaDisciplina(req, res),
);
notasRouter.get("/:id", (req, res) => notasController.buscarPorId(req, res));
notasRouter.post("/", (req, res) => notasController.lancar(req, res));
notasRouter.put("/:id", (req, res) => notasController.atualizar(req, res));
notasRouter.delete("/:id", (req, res) => notasController.remover(req, res));
