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
