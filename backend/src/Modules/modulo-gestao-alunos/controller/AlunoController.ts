import { Request, Response } from "express";
import { AlunoService } from "../service/AlunoService";

export class AlunoController {
    alunoService = new AlunoService();

    async criarAluno(req: Request, res: Response) {
        try {
            const aluno = await this.alunoService.criarAluno(req.body);
            res.status(201).json(aluno);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarAlunos(req: Request, res: Response) {
        try {
            const { cursoId, periodo, nome } = req.query as Record<string, string | undefined>;

            const alunos = await this.alunoService.listarAlunos({ cursoId, periodo, nome });
            res.status(200).json(alunos);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarAlunoPorId(req: Request, res: Response) {
        try {
            const aluno = await this.alunoService.buscarAlunoPorId(String(req.params.id));
            if (aluno) {
                res.status(200).json(aluno);
            } else {
                res.status(404).json({ error: "Aluno não encontrado" });
            }
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarAluno(req: Request, res: Response) {
        try {
            const q = req.query.q as string;
            if (!q) return res.status(400).json({ error: 'Parâmetro "q" é obrigatório.' });
            const alunos = await this.alunoService.buscarAlunoPorCpfOuMatricula(q);
            res.status(200).json(alunos);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarAlunoPorMatricula(req: Request, res: Response) {
        try {
            const aluno = await this.alunoService.buscarAlunoPorMatricula(String(req.params.matricula));
            if (aluno) {
                res.status(200).json(aluno);
            } else {
                res.status(404).json({ error: "Aluno não encontrado" });
            }
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async atualizarAluno(req: Request, res: Response) {
        try {
            const aluno = await this.alunoService.atualizarAluno(String(req.params.matricula), req.body);
            if (aluno) {
                res.status(200).json(aluno);
            } else {
                res.status(404).json({ error: "Aluno não encontrado" });
            }
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

}