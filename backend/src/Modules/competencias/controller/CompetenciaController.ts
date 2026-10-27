import type { Request, Response } from "express";
import { CompetenciaService } from "../service/CompetenciaService";

export class CompetenciaController {
  service = new CompetenciaService();

  listar = async (req: Request, res: Response) => {
    try { res.json(await this.service.listar(req.query)); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  buscar = async (req: Request, res: Response) => {
    const item = await this.service.buscarPorId(String(req.params.id));
    if (!item) return res.status(404).json({ error: "Competencia nao encontrada" });
    return res.json(item);
  };

  criar = async (req: Request, res: Response) => {
    try { res.status(201).json(await this.service.criar(req.body)); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  atualizar = async (req: Request, res: Response) => {
    try {
      const item = await this.service.atualizar(String(req.params.id), req.body);
      if (!item) return res.status(404).json({ error: "Competencia nao encontrada" });
      return res.json(item);
    } catch (error) { return res.status(400).json({ error: (error as Error).message }); }
  };

  status = async (req: Request, res: Response) => {
    if (typeof req.body?.ativo !== "boolean") return res.status(400).json({ error: "Informe o status ativo" });
    const item = await this.service.alterarStatus(String(req.params.id), req.body.ativo);
    if (!item) return res.status(404).json({ error: "Competencia nao encontrada" });
    return res.json(item);
  };

  remover = async (req: Request, res: Response) => {
    try {
      const removidos = await this.service.remover(String(req.params.id));
      if (!removidos) return res.status(404).json({ error: "Competencia nao encontrada" });
      return res.status(204).send();
    } catch (error) { return res.status((error as any).status ?? 400).json({ error: (error as Error).message }); }
  };
}
