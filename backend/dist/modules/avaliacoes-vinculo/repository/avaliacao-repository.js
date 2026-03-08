import db from '../../../database/index.js';
export const AvaliacaoRepository = {
    async buscarTodas() {
        return db('avaliacoes').select('*');
    },
    async criar(dados) {
        const [novaAvaliacao] = await db('avaliacoes')
            .insert(dados)
            .returning('*');
        return novaAvaliacao;
    },
    async atualizar(id, dados) {
        const [avaliacaoAtualizada] = await db('avaliacoes')
            .where({ avaliacaoId: id })
            .update(dados)
            .returning('*');
        return avaliacaoAtualizada;
    },
    async deletar(id) {
        return db('avaliacoes')
            .where({ avaliacaoId: id })
            .del();
    }
};
//# sourceMappingURL=avaliacao-repository.js.map