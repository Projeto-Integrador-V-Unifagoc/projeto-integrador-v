import type { Request, Response } from "express";
import { RequisitoCurricularService } from "../service/RequisitoCurricularService";

export class RequisitoCurricularController {
  service = new RequisitoCurricularService();
  listar = async (req: Request, res: Response) => {
    try { res.json(await this.service.listar(String(req.params.matrizId))); }
    catch (error) { res.status((error as any).status ?? 400).json({ error: (error as Error).message }); }
  };
  criar = async (req: Request, res: Response) => {
    try { res.status(201).json(await this.service.criar(req.body)); }
    catch (error) { res.status((error as any).status ?? 400).json({ error: (error as Error).message }); }
  };
  atualizar = async (req: Request, res: Response) => {
    try { res.json(await this.service.atualizar(String(req.params.id), req.body)); }
    catch (error) { res.status((error as any).status ?? 400).json({ error: (error as Error).message }); }
  };
  remover = async (req: Request, res: Response) => {
    try { await this.service.remover(String(req.params.id)); res.status(204).send(); }
    catch (error) { res.status((error as any).status ?? 400).json({ error: (error as Error).message }); }
  };
}

