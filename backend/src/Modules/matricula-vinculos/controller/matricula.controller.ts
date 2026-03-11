import { Request, Response } from "express";
import { matriculasMock } from "../mock/matriculas.mock";

export class MatriculaController {

  listarPorAluno(req: Request, res: Response) {
    const { alunoId } = req.params;

    const matriculas = matriculasMock.filter(
      (m) => m.alunoId === Number(alunoId)
    );

    return res.status(200).json(matriculas);
  }

  criarMatricula(req: Request, res: Response) {

    const nova = {
      id: matriculasMock.length + 1,
      ...req.body
    };

    matriculasMock.push(nova);

    return res.status(201).json(nova);
  }
}