import db from '../../../database/index.js';
import type { Avaliacao } from '../models/interface.js';

export const AvaliacaoRepository = {

    async criar(dados: Avaliacao): Promise<Avaliacao | undefined> {
        const [novaAvaliacao] = await db<Avaliacao>('avaliacoes')
            .insert(dados)
            .returning('*');

        return novaAvaliacao;
    },
};
/*
//so pra testar as rotas
import type { Avaliacao } from '../models/interface';

let avaliacoesFakeDB: Avaliacao[] = [];
let proximoId = 1;

export const AvaliacaoRepository = {

  async criar(dados: Avaliacao) {
    const novaAvaliacao = { ...dados, id_avaliacao: proximoId++ };
    avaliacoesFakeDB.push(novaAvaliacao);

    console.log("Avaliações no banco agora:", avaliacoesFakeDB);

    return novaAvaliacao;
  }
};*/
 