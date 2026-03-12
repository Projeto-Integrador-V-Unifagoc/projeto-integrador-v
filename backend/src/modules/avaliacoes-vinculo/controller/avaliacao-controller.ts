import type { Request, Response } from "express";

import { AvaliacaoService } from "../services/avaliacao-service";

const service = new AvaliacaoService();

export const AvaliacaoController = {
  async listar(req: Request, res: Response) {
    try {
      const avaliacoes = await service.listar();
      return res.json(avaliacoes);
    } catch (error) {
      console.error("Erro ao listar avaliacoes:", error);
      return res.status(500).json({ erro: "Erro ao buscar avaliacoes" });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const avaliacao = await service.criar(req.body);
      return res.status(201).json(avaliacao);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar avaliacao";
      return res.status(400).json({ erro: message });
    }
  },

  async atualizar(req: Request<{ id: string }>, res: Response) {
    try {
      const avaliacao = await service.atualizar(Number(req.params.id), req.body);

      if (!avaliacao) {
        return res.status(404).json({ erro: "Avaliacao nao encontrada" });
      }

      return res.json(avaliacao);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar avaliacao";
      return res.status(400).json({ erro: message });
    }
  },

  async deletar(req: Request<{ id: string }>, res: Response) {
    try {
      const deleted = await service.deletar(Number(req.params.id));

      if (!deleted) {
        return res.status(404).json({ erro: "Avaliacao nao encontrada" });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar avaliacao:", error);
      return res.status(500).json({ erro: "Erro ao deletar avaliacao" });
    }
  },
};
