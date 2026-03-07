import db from 'database/index '

export interface Avaliacao {
    avaliacao_id?: number;
    avaliacao_vinculo_id: number; //caso haja relação com outra tabela.
    avaliacao_nota: number;
    avalicao_nome: string;
}

export const AvavaliacaoRepository = {
    async buscarTodas(){
        return db<Avaliacao>('avaliacoes'.select('*'));
    },

    async criar(dados: Avaliacao) {
        const [novaAvaliacao] = await db<Avaliacao>('avaliacoes').insert(dados).returning('*');
        return novaAvaliacao;
    },

    async atualizar(id: number, dados: Partial<Avaliacao>) {
    const [avaliacaoAtualizada] = await db<Avaliacao>('avaliacoes')
      .where({ id })
      .update(dados)
      .returning('*');
    return avaliacaoAtualizada;
    },
    
    async deletar(id: number) {
    return db('avaliacoes').where({ id }).del();
    }
    
};
 