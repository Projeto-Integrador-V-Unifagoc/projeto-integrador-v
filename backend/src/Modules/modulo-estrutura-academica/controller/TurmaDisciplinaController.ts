import { Request, Response } from "express";
import { TurmaDisciplinaService } from "../service/TurmaDisciplinaService";

export class TurmaDisciplinaController {
    turmaDisciplinaService = new TurmaDisciplinaService();

    async criarTurmaDisciplina(req: Request, res: Response) {
        try {
            const turmaDisciplina = await this.turmaDisciplinaService.criarTurmaDisciplina(String(req.params.id), req.body);
            res.status(201).json(turmaDisciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarTurmaDisciplinasPorTurmaId(req: Request, res: Response) {
        try {
            const turmaDisciplinas = await this.turmaDisciplinaService.listarTurmaDisciplinasPorTurmaId(String(req.params.id));
            res.status(200).json(turmaDisciplinas);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async atualizarTurmaDisciplina(req: Request, res: Response) {
        try {
            const turmaDisciplina = await this.turmaDisciplinaService.atualizarTurmaDisciplina(
                String(req.params.id),
                String(req.params.turmaDisciplinaId),
                req.body
            );

            if (!turmaDisciplina) {
                return res.status(404).json({ error: "Disciplina da turma nao encontrada" });
            }

            res.status(200).json(turmaDisciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async removerTurmaDisciplina(req: Request, res: Response) {
        try {
            const removidos = await this.turmaDisciplinaService.removerTurmaDisciplina(
                String(req.params.id),
                String(req.params.turmaDisciplinaId)
            );

            if (!removidos) {
                return res.status(404).json({ error: "Disciplina da turma nao encontrada" });
            }

            res.status(204).send();
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}
