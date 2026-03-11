import type { Request, Response } from 'express';
import type { Avaliacao } from '../models/interface';
import { AvaliacaoRepository } from '../repository/avaliacao-repository';
import { AvaliacaoService } from "../services/avaliacao-service";

const repo = AvaliacaoRepository;
const service = new AvaliacaoService();

// GET - Listar
export const getAvaliacoes = async (req: Request, res: Response) => {
    try {
        const dadosMock: Avaliacao[] = [
            { 
                avaliacaoId: 1, 
                avaliacaoNota: 5, 
                avalicaoNome: "Teste",
                avaliacaoVinculoId: 101 
            }
        ];
        res.json(dadosMock);
    } catch (error) {
        console.error("Erro no Controller:", error);
        res.status(500).json({ erro: "Erro ao buscar dados" });
    }
};

// PUT - Atualizar
export const atualizar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const avaliacao = await service.atualizar(Number(id), req.body);
    return res.json(avaliacao);
  } catch (error: any) {
    return res.status(400).json({ erro: error.message });
  }
};

// POST - Criar
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
}