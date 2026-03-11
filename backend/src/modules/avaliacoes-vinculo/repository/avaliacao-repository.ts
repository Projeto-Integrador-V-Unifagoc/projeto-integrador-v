import db from '../../../database/index'; // Removi o .js para CommonJS
import type { Avaliacao } from '../models/interface';

export const AvaliacaoRepository = {
    async buscarTodas(): Promise<Avaliacao[]> {
        return db<Avaliacao>('avaliacoes').select('*');
    },

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

    async atualizar(id: number, dados: Partial<Avaliacao>): Promise<Avaliacao | undefined> {
        const [avaliacaoAtualizada] = await db<Avaliacao>('avaliacoes')
            .where({ avaliacaoId: id })
            .update(dados)
            .returning('*');
        return avaliacaoAtualizada;
    },
    
    async deletar(id: number) {
        return db('avaliacoes')
            .where({ avaliacaoId: id })
            .del();
    }
};
 