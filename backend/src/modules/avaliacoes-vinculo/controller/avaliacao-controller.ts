import type { Request, Response } from 'express';
import { AvaliacaoService } from '../services/avaliacao-service';

export const AvaliacaoController = {
 
  async create(req: Request, res: Response): Promise<any> {
    try {
      const { tipo_avaliacao, descricao_avaliacao, valor_avaliacao, data_avaliacao, data_devolucao_avaliacao } = req.body;
      
      const novaAvaliacao = await AvaliacaoService.criarAvaliacao({ 
        tipo_avaliacao, 
        descricao_avaliacao,
        valor_avaliacao, 
        data_avaliacao,
        data_devolucao_avaliacao
      });
      return res.status(201).json(novaAvaliacao);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
};
