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
