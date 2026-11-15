import type { Request, Response } from "express";
import { HomeCoordenacaoService } from "../service/HomeCoordenacaoService";

export class HomeCoordenacaoController {
  service = new HomeCoordenacaoService();

  dashboard = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.dashboard(req, req.query.periodoLetivoId as string | undefined));
    } catch (error) {
      res.status((error as any).status ?? 400).json({ error: (error as Error).message });
    }
  };
}

