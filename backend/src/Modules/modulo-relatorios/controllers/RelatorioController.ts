import { Request, Response } from 'express';
import { RelatorioService } from '../services/RelatorioService';

export class RelatorioController {
  private service = new RelatorioService();

  async listarRelatoriosAcademicos(req: Request, res: Response) {
    try {
      const usuario = (req as any).user;
      const result = await this.service.listarRelatorios(req.query, {
        usuarioId: String(usuario.id),
        tipoUsuario: usuario.tipo_usuario,
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }
}
