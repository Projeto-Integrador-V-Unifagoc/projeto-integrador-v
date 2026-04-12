import db from '../../../database/index.js';
import type { Avaliacao, CriarAvaliacaoDTO, AtualizarAvaliacaoDTO } from '../models/avaliacaoModels.js';

export const avaliacaoRepository = {
  buscarTodas: async (): Promise<Avaliacao[]> => {
    return await db<Avaliacao>('piv.avaliacao').select('*');
  },

  buscarPorId: async (id: string): Promise<Avaliacao | undefined> => {
    return await db<Avaliacao>('piv.avaliacao').where({ id }).first();
  },

  buscarPorTurma: async (turma_id: string): Promise<Avaliacao[]> => {
    return await db<Avaliacao>('piv.avaliacao').where({ turma_id }).select('*');
  },

  criar: async (dados: CriarAvaliacaoDTO): Promise<Avaliacao> => {
    const [novaAvaliacao] = await db<Avaliacao>('piv.avaliacao')
      .insert(dados)
      .returning('*');
    return novaAvaliacao;
  },

  atualizar: async (id: string, dados: AtualizarAvaliacaoDTO): Promise<Avaliacao | undefined> => {
    const [avaliacaoAtualizada] = await db<Avaliacao>('piv.avaliacao')
      .where({ id })
      .update(dados)
      .returning('*');
    return avaliacaoAtualizada;
  },

  deletar: async (id: string): Promise<number> => {
    return await db('piv.avaliacao').where({ id }).del();
  },
};
