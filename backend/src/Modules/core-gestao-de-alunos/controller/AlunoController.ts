import { Request, Response } from "express";
import { AlunoService } from "../services/AlunoService";
import { Aluno } from "../models/Aluno";

export class AlunoController {

    private alunoService = new AlunoService()

    async criarAluno(req: Request<{}, {}, Aluno>, res: Response) {

        const aluno = await this.alunoService.criarAluno(req.body)

        return res.status(201).json(aluno)
    }

    async listarAlunos(req: Request, res: Response) {
        const alunos = await this.alunoService.listarAlunos()
        return res.json(alunos)
    } 
    
    async buscarAlunoPorMatricula(req: Request<{ matricula: string }>, res: Response) {
        const { matricula } = req.params
        const aluno = await this.alunoService.buscarAlunoPorMatricula(matricula)
        if(!aluno){
            return res.status(404).json({ message: "Aluno não encontrado" })
        }
        return res.json(aluno)
    }
}