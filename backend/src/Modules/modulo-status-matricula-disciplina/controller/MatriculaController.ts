import { Request, Response } from "express";
import { MatriculaService } from "../services/MatriculaSerices";

export class MatriculaController {
    matriculaService = new MatriculaService();

    async criarStatusMatriculaCurso(req: Request, res: Response) {
        try {
            const status = await this.matriculaService.criarStatusMatriculaCurso(req.body);
            res.status(201).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar status de matrícula do curso" });
        }
    }

    async listarStatusMatriculaCurso(req: Request, res: Response) {
        try {
            const status = await this.matriculaService.listarStatusMatriculaCurso();
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar status de matrícula do curso" });
        }
    }

    async buscarStatusMatriculaCursoPorId(req: Request, res: Response) {
        try {
            const status = await this.matriculaService.buscarStatusMatriculaCursoPorId(String(req.params.id));
            if (!status) {
                return res.status(404).json({ error: "Status de matrícula do curso não encontrado" });
            }
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar status de matrícula do curso" });
        }
    }

    async atualizarStatusMatriculaCurso(req: Request, res: Response) {
        try {
            const status = await this.matriculaService.atualizarStatusMatriculaCurso(String(req.params.id), req.body);
            if (!status) {
                return res.status(404).json({ error: "Status de matrícula do curso não encontrado" });
            }
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao atualizar status de matrícula do curso" });
        }
    }
}
