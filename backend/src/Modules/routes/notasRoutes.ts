import { Router } from "express";
import { NotasMockController } from "../notas/controller/NotasMockController.js";

const notasMockController = new NotasMockController();
export const notasRouter = Router();

notasRouter.get("/mock", (req, res) => notasMockController.listarTodos(req, res));
notasRouter.get("/mock/aluno/:alunoId", (req, res) => notasMockController.buscarPorAluno(req, res));
notasRouter.get("/mock/turma/:turmaId", (req, res) => notasMockController.buscarPorTurma(req, res));
notasRouter.get("/mock/disciplina/:disciplinaId", (req, res) =>
  notasMockController.buscarPorDisciplina(req, res)
);
