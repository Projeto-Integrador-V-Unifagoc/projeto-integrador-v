import { Request, Response } from "express";
import { TurmaService } from "../service/TurmaService";

export class TurmaController {
    turmaService = new TurmaService();

    async criarTurma(req: Request, res: Response) {
        try {
            const turma = await this.turmaService.criarTurma(req.body);
            res.status(201).json(turma);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarTurmas(req: Request, res: Response) {
        try {
            const turmas = await this.turmaService.listarTurmas();
            res.status(200).json(turmas);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarTurmaPorId(req: Request, res: Response) {
        try {
            const turma = await this.turmaService.buscarTurmaPorId(String(req.params.id));

            if (!turma) {
                return res.status(404).json({ error: "Turma nao encontrada" });
            }

            res.status(200).json(turma);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async atualizarTurma(req: Request, res: Response) {
        try {
            const turma = await this.turmaService.atualizarTurma(String(req.params.id), req.body);

            if (!turma) {
                return res.status(404).json({ error: "Turma nao encontrada" });
            }

            res.status(200).json(turma);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async removerTurma(req: Request, res: Response) {
        try {
            const removidos = await this.turmaService.removerTurma(String(req.params.id));

            if (!removidos) {
                return res.status(404).json({ error: "Turma nao encontrada" });
            }

            res.status(204).send();
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}
