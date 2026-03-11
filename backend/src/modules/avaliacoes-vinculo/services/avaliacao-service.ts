import { AvaliacaoRepository } from '../repository/avaliacao-repository';
import type { Avaliacao } from '../models/interface';

export const AvaliacaoService = {

    async criarAvaliacao(dados: Avaliacao){
        if (dados.valor_avaliacao < 0 || dados.valor_avaliacao > 15){
            throw new Error("valor da avaliacao entre 0 e 15");
        }
        
        const tiposPermitidos = ['prova', 'trabalho', 'tpi'];
        if (!tiposPermitidos.includes(dados.tipo_avaliacao)) {
            throw new Error("O tipo de avaliação inválido. Escolha: 'prova', 'trabalho' ou 'tpi'.");
        }

        if (!dados.descricao_avaliacao || dados.descricao_avaliacao.trim() === "") {       
            throw new Error("A descrição da avaliação é obrigatória.");
        }
        return await AvaliacaoRepository.criar(dados);
    }
};