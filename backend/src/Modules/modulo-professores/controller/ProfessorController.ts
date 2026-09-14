import { Request, Response } from "express";
import { ProfessorService } from "../service/ProfessorService";

export class ProfessorController {
    professorService = new ProfessorService();

    async listarProfessores(req: Request, res: Response) {
        try {
            const professores = await this.professorService.listarProfessores();
            res.status(200).json(professores);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}
