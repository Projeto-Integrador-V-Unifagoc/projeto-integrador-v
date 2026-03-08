import db from '../../../database/index.js';
import type { Avaliacao } from '../models/interface.js';

export const AvaliacaoRepository = {
   
    async buscarTodas():Promise<Avaliacao[]>{
        return db<Avaliacao>('avaliacoes').select('*');
    },

    async criar(dados: Avaliacao): Promise<Avaliacao | undefined> {
        const [novaAvaliacao] = await db<Avaliacao>('avaliacoes')
            .insert(dados)
            .returning('*');

        return novaAvaliacao;
    },

    async atualizar(id: number, dados: Partial<Avaliacao>): Promise<Avaliacao | undefined> {
        const [avaliacaoAtualizada] = await db<Avaliacao>('avaliacoes')
            .where({ avaliacaoId:id })
            .update(dados)
            .returning('*');

        return avaliacaoAtualizada;
    },
    
    async deletar(id: number) {
        return db('avaliacoes')
            .where({ avaliacaoId:id })
            .del();
    }
    
};
 