import type { Avaliacao } from '../models/interface.js';
import type { Request, Response} from 'express';
import { AvaliacaoRepository } from '../repository/avaliacao-repository.js';

const repository = new AvaliacaoRepository();

export const getAvaliacoes = async (req: Request, res: Response) => {
    try{

        //somente para testar
        const dadosMock = [{ avaliacaoId: 1, nota: 5, comentario: "Teste" }];
        res.json(dadosMock);

    }catch (error) {
        res.status(500).json({erro: "Erro ao buscar dados"});
    }
};