import db from '../../../database/index.js';
import type { Avaliacao, CriarAvaliacaoDTO, AtualizarAvaliacaoDTO } from '../models/avaliacaoModels.js';

export const avaliacaoRepository = {
  baseQuery: () => {
    return db('piv.avaliacao')
      .leftJoin('piv.turma_disciplina', 'piv.avaliacao.turma_disciplina_id', 'piv.turma_disciplina.id')
      .leftJoin('piv.turma', 'piv.turma_disciplina.turma_id', 'piv.turma.id')
      .leftJoin('piv.curso_disciplina', 'piv.turma_disciplina.curso_disciplina_id', 'piv.curso_disciplina.id')
      .leftJoin('piv.disciplinas', 'piv.curso_disciplina.disciplina_id', 'piv.disciplinas.id')
      .leftJoin('piv.professor', 'piv.turma_disciplina.professor_id', 'piv.professor.id')
      .leftJoin('piv.pessoa as professor_pessoa', 'piv.professor.pessoa_id', 'professor_pessoa.id')
      .select(
        'piv.avaliacao.*',
        'piv.turma.id as turma_id',
        'piv.turma.sigla as turma_sigla',
        'piv.turma.descricao as turma_descricao',
        'piv.disciplinas.id as disciplina_id',
        'piv.disciplinas.codigo as disciplina_codigo',
        'piv.disciplinas.nome as disciplina_nome',
        'piv.professor.id as professor_id',
        'professor_pessoa.nome as professor_nome',
      );
  },

  buscarTodas: async (): Promise<Avaliacao[]> => {
    return await avaliacaoRepository.baseQuery()
      .orderBy('piv.turma.sigla', 'asc')
      .orderBy('piv.disciplinas.nome', 'asc')
      .orderBy('piv.avaliacao.data_lancamento', 'asc');
  },

  buscarPorId: async (id: string): Promise<Avaliacao | undefined> => {
    return await avaliacaoRepository.baseQuery()
      .where('piv.avaliacao.id', id)
      .first();
  },

  buscarPorTurmaDisciplina: async (turma_disciplina_id: string): Promise<Avaliacao[]> => {
    return await db<Avaliacao>('piv.avaliacao').where({ turma_disciplina_id }).select('*');
  },

  criar: async (dados: CriarAvaliacaoDTO): Promise<Avaliacao> => {
    const [novaAvaliacao] = await db<Avaliacao>('piv.avaliacao')
      .insert(dados)
      .returning('*');

    if (!novaAvaliacao) {
      throw new Error('Erro ao criar avaliação');
    }

    return (await avaliacaoRepository.buscarPorId(novaAvaliacao.id)) as Avaliacao;
  },

  atualizar: async (id: string, dados: AtualizarAvaliacaoDTO): Promise<Avaliacao | undefined> => {
    const [avaliacaoAtualizada] = await db<Avaliacao>('piv.avaliacao')
      .where({ id })
      .update(dados)
      .returning('*');
    return avaliacaoAtualizada
      ? await avaliacaoRepository.buscarPorId(avaliacaoAtualizada.id)
      : undefined;
  },

  deletar: async (id: string): Promise<number> => {
    return await db('piv.avaliacao').where({ id }).del();
  },
};
