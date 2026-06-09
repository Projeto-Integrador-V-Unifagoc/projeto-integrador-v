import { AlunoService } from "../service/AlunoService";

export class AlunoController {
    alunoService = new AlunoService();

    async criarAluno(req: any, res: any) {
        try {
            const aluno = await this.alunoService.criarAluno(req.body);
            res.status(201).json(aluno);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarAlunos(req: any, res: any) {
        try {
            const { cursoId, periodo } = req.query;

            const alunos = await this.alunoService.listarAlunos({ cursoId, periodo });
            res.status(200).json(alunos);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarAlunoPorId(req: any, res: any) {
        try {
            const aluno = await this.alunoService.buscarAlunoPorId(req.params.id);
            if (aluno) {
                res.status(200).json(aluno);
            } else {
                res.status(404).json({ error: "Aluno não encontrado" });
            }
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarAluno(req: any, res: any) {
        try {
            const q = req.query.q as string;
            if (!q) return res.status(400).json({ error: 'Parâmetro "q" é obrigatório.' });
            const alunos = await this.alunoService.buscarAlunoPorCpfOuMatricula(q);
            res.status(200).json(alunos);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarAlunoPorMatricula(req: any, res: any) {
        try {
            const aluno = await this.alunoService.buscarAlunoPorMatricula(req.params.matricula);
            if (aluno) {
                res.status(200).json(aluno);
            } else {
                res.status(404).json({ error: "Aluno não encontrado" });
            }
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async atualizarAluno(req: any, res: any) {
        try {
            const aluno = await this.alunoService.atualizarAluno(req.params.matricula, req.body);
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