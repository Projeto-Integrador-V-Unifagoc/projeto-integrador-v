import { Router } from "express";
import { ProfessorController } from "../modulo-professores/controller/ProfessorController";

const professoresAcademicoRouter = Router();
const professorController = new ProfessorController();

professoresAcademicoRouter.get("/", (req, res) =>
  professorController.listarProfessores(req, res)
);

export { professoresAcademicoRouter };
