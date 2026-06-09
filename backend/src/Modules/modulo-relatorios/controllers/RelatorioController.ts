import { Request, Response } from 'express';
import { RelatorioService } from '../services/RelatorioService';

export class RelatorioController {
  async handle(req: Request, res: Response) {
    const service = new RelatorioService();
    const result = await service.execute();

    return res.json(result);
  }
}