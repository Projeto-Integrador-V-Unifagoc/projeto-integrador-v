import type { Request, Response } from "express";
import { HomeProfessorService } from "../service/HomeProfessorService";

export class HomeProfessorController {
  service = new HomeProfessorService();

  dashboard = async (req: Request, res: Response) => {
    try { res.json(await this.service.dashboard(req, req.query.periodoLetivoId as string | undefined)); }
    catch (error) { res.status((error as any).status ?? 400).json({ error: (error as Error).message }); }
  };

  detalhe = async (req: Request, res: Response) => {
    try { res.json(await this.service.detalhe(req, String(req.params.turmaDisciplinaId))); }
    catch (error) { res.status((error as any).status ?? 400).json({ error: (error as Error).message }); }
  };

  detalheAluno = async (req: Request, res: Response) => {
    try { res.json(await this.service.detalheAluno(req, String(req.params.turmaDisciplinaId), String(req.params.alunoId))); }
    catch (error) { res.status((error as any).status ?? 400).json({ error: (error as Error).message }); }
  };
}
