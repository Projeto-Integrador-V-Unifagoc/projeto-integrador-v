import type { Avaliacao } from '../models/interface.js';
import type { Request, Response} from 'express';
import { AvaliacaoRepository } from '../repository/avaliacao-repository.js';

export const deletarAvaliacao = async (req: Request, res: Response) => {
    const dadosMock = [
    { "avaliacaoId": 1, "nota": 14, "comentario": "Prova Estudo Dirigido 1" },
    { "avaliacaoId": 2, "nota": 12, "comentario": "Prova Estudo Dirigido 2" },
    { "avaliacaoId": 3, "nota": 10, "comentario": "Prova Estudo Dirigido 3" },
    { "avaliacaoId": 4, "nota": 9, "comentario": "Prova Estudo Dirigido 4" }];

    const id = Number(req.body.avaliacaoId);

    for (let i = 0; i < dadosMock.length; i++) {
        if (dadosMock[i]?.avaliacaoId == id) {
            dadosMock.splice(i, 1);
                return res.json({
                    message: "Avaliação deletada",
                    dados: dadosMock
                });
            }
    }

    return res.status(404).json({
        message: "Avaliação não encontrada"
    });
    
};
import type { Request, Response } from 'express';
import type { Avaliacao } from '../models/interface';
import { AvaliacaoRepository } from '../repository/avaliacao-repository';

const repo = AvaliacaoRepository;

export const getAvaliacoes = async (req: Request, res: Response) => {
    try {
        // Mock temporário com todos os campos obrigatórios da interface
        const dadosMock: Avaliacao[] = [
            { 
                avaliacaoId: 1, 
                avaliacaoNota: 5, 
                avalicaoNome: "Teste",
                avaliacaoVinculoId: 101 // Campo adicionado para sanar o erro
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
