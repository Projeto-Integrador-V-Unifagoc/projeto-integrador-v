import { Request, Response } from "express";
import { DisciplinaService } from "../services/DisciplinaServices";

export class StatusDisciplinaController {
    disciplinaService = new DisciplinaService();

    async criarStatusMatriculaDisciplina(req: Request, res: Response) {
        try {
            const status = await this.disciplinaService.criarStatusMatriculaDisciplina(req.body);
            res.status(201).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar status de matrícula da disciplina" });
        }
    }

    async listarStatusMatriculaDisciplina(req: Request, res: Response) {
        try {
            const status = await this.disciplinaService.listarStatusMatriculaDisciplina();
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar status de matrícula da disciplina" });
        }
    }

    async buscarStatusMatriculaDisciplinaPorId(req: Request, res: Response) {
        try {
            const status = await this.disciplinaService.buscarStatusMatriculaDisciplinaPorId(String(req.params.id));
            if (!status) {
                return res.status(404).json({ error: "Status de matrícula da disciplina não encontrado" });
            }
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar status de matrícula da disciplina" });
        }
    }

    async atualizarStatusMatriculaDisciplina(req: Request, res: Response) {
        try {
            const status = await this.disciplinaService.atualizarStatusMatriculaDisciplina(String(req.params.id), req.body);
            if (!status) {
                return res.status(404).json({ error: "Status de matrícula da disciplina não encontrado" });
            }
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao atualizar status de matrícula da disciplina" });
        }
    }
}
