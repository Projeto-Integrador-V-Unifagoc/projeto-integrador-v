import { Request, Response } from "express";
import { AlunoService } from "../services/AlunoService";
import { Aluno } from "../models/Aluno";

export class AlunoController {

    private alunoService = new AlunoService()

    async criarAluno(req: Request<{}, {}, Aluno>, res: Response) {

        const aluno = await this.alunoService.criarAluno(req.body)

        return res.status(201).json(aluno)
    }
}