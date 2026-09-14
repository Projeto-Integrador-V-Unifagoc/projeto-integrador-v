import { Request, Response } from 'express';
import { RelatorioService } from '../services/RelatorioService';
import type { TipoUsuarioRelatorio } from '../models/RelatorioAcademico';

export class RelatorioController {
  private service = new RelatorioService();

  async listarRelatoriosAcademicos(req: Request, res: Response) {
    try {
      const usuario = req.user;
      const result = await this.service.listarRelatorios(req.query, {
        usuarioId: String(usuario?.id),
        tipoUsuario: usuario?.tipo_usuario as TipoUsuarioRelatorio,
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        error: "Nao foi possivel carregar os relatorios a partir do banco de dados.",
        details: (error as Error).message,
      });
    }
  }

  async statusFonteDados(req: Request, res: Response) {
    try {
      return res.status(200).json(await this.service.obterStatusFonteDados());
    } catch (error) {
      return res.status(500).json({
        error: "Nao foi possivel validar a fonte de dados dos relatorios.",
        details: (error as Error).message,
      });
    }
  }
}
