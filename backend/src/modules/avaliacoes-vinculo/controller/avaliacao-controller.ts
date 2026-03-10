import type { Request, Response } from "express";
import { AvaliacaoService } from "../services/avaliacao-service.js";

export class AvaliacaoController {

  private service = new AvaliacaoService();

  atualizar = async (req: Request, res: Response) => {

    try {

      const { id } = req.params;

      const avaliacao = await this.service.atualizar(
        Number(id),
        req.body
      );

      return res.json(avaliacao);

    } catch (error: any) {

      return res.status(400).json({
        erro: error.message
      });

    }

  }

}