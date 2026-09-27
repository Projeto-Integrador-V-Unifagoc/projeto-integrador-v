import { db } from '../../../database/connection.js';
import type { AtualizarProfessor, CriarProfessorDTO, FiltroProfessor } from '../models/professorModels.js';

const baseQuery = () => db('piv.professor')
  .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
  .leftJoin('piv.faculdade', 'piv.professor.faculdade_id', 'piv.faculdade.id')
  .leftJoin('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id');

const camposCompletos = [
  'piv.professor.id', 'piv.professor.usuario_id', 'piv.professor.pessoa_id',
  'piv.professor.ativo', 'piv.pessoa.nome', 'piv.pessoa.cpf',
  'piv.pessoa.data_nascimento', 'piv.pessoa.logradouro', 'piv.pessoa.numero',
  'piv.pessoa.bairro', 'piv.pessoa.cidade_id', 'piv.pessoa.estado', 'piv.pessoa.cep',
  'piv.professor.faculdade_id', 'piv.faculdade.nome as faculdade',
];

async function anexarDisciplinas<T extends { id: string }>(professores: T[]) {
  const ids = professores.map((professor) => professor.id);
  const vinculos = ids.length
    ? await db('piv.professor_disciplina')
        .join('piv.disciplinas', 'piv.professor_disciplina.disciplina_id', 'piv.disciplinas.id')
        .whereIn('piv.professor_disciplina.professor_id', ids)
        .select('piv.professor_disciplina.professor_id', 'piv.disciplinas.id', 'piv.disciplinas.nome')
        .orderBy('piv.disciplinas.nome')
    : [];
  const porProfessor = new Map<string, { id: string; nome: string }[]>();
  for (const vinculo of vinculos) {
    const lista = porProfessor.get(vinculo.professor_id) ?? [];
    lista.push({ id: vinculo.id, nome: vinculo.nome });
    porProfessor.set(vinculo.professor_id, lista);
  }
  return professores.map((professor) => ({ ...professor, disciplinas: porProfessor.get(professor.id) ?? [] }));
}

export const professorRepository = {
  async listarTodos(filtro: FiltroProfessor = {}) {
    const query = baseQuery().select(camposCompletos).orderBy('piv.pessoa.nome');
    if (filtro.ativo !== undefined) query.where('piv.professor.ativo', filtro.ativo);
    return anexarDisciplinas(await query);
  },

  async listarOpcoes() {
    return baseQuery()
      .where('piv.professor.ativo', true)
      .select('piv.professor.id', 'piv.pessoa.nome')
      .orderBy('piv.pessoa.nome');
  },

  async buscarPorId(id: string) {
    const professor = await baseQuery().select(camposCompletos).where('piv.professor.id', id).first();
    if (!professor) return professor;
    const [comDisciplinas] = await anexarDisciplinas([professor]);
    return comDisciplinas;
  },

  async buscarPorCpf(cpf: string) {
    return db('piv.pessoa').join('piv.professor', 'piv.professor.pessoa_id', 'piv.pessoa.id')
      .select('piv.professor.id').where('piv.pessoa.cpf', cpf).first();
  },

  async buscarDisciplinasAtivasPorIds(ids: string[]) {
    if (!ids.length) return [];
    return db('piv.disciplinas').whereIn('id', ids).andWhere('ativo', true).select('id', 'nome');
  },

  async buscarFaculdadePorId(id: string) {
    return db('piv.faculdade').where({ id }).select('id').first();
  },

  async buscarCidadePorIbge(ibge: string) {
    return db('piv.cidade').select('ibge', 'uf').where({ ibge }).first();
  },

  async criar(dados: CriarProfessorDTO) {
    return db.transaction(async (trx) => {
      const [pessoa] = await trx('piv.pessoa').insert({
        nome: dados.nome, cpf: dados.cpf, data_nascimento: dados.data_nascimento,
        logradouro: dados.logradouro, numero: dados.numero, bairro: dados.bairro,
        cidade_id: dados.cidade_id, estado: dados.estado, cep: dados.cep,
      }).returning('*');
      const [professor] = await trx('piv.professor').insert({
        usuario_id: null, pessoa_id: pessoa.id,
        faculdade_id: dados.faculdade_id ?? null, ativo: true,
      }).returning('*');
      await trx('piv.professor_disciplina').insert(
        dados.disciplinaIds.map((disciplina_id) => ({ professor_id: professor.id, disciplina_id })),
      );
      return { ...professor, nome: pessoa.nome, cpf: pessoa.cpf };
    });
  },

  async atualizar(id: string, dados: AtualizarProfessor) {
    return db.transaction(async (trx) => {
      const professor = await trx('piv.professor').where({ id }).first();
      if (!professor) return null;
      const pessoa: Record<string, unknown> = {};
      for (const campo of ['nome', 'cpf', 'data_nascimento', 'logradouro', 'numero', 'bairro', 'cidade_id', 'estado', 'cep'] as const) {
        if (dados[campo] !== undefined) pessoa[campo] = dados[campo];
      }
      if (Object.keys(pessoa).length) await trx('piv.pessoa').where({ id: professor.pessoa_id }).update(pessoa);
      if (dados.faculdade_id !== undefined) {
        await trx('piv.professor').where({ id }).update({ faculdade_id: dados.faculdade_id, updated_at: trx.fn.now() });
      }
      if (dados.disciplinaIds !== undefined) {
        await trx('piv.professor_disciplina').where({ professor_id: id }).del();
        if (dados.disciplinaIds.length) {
          await trx('piv.professor_disciplina').insert(
            dados.disciplinaIds.map((disciplina_id) => ({ professor_id: id, disciplina_id })),
          );
        }
      }
      if (dados.nome !== undefined && professor.usuario_id) {
        await trx('piv.usuario').where({ id: professor.usuario_id }).update({ nome: dados.nome, updated_at: trx.fn.now() });
      }
      const atualizado = await trx('piv.professor')
        .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
        .leftJoin('piv.faculdade', 'piv.professor.faculdade_id', 'piv.faculdade.id')
        .leftJoin('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id')
        .select(camposCompletos).where('piv.professor.id', id).first();
      if (!atualizado) return atualizado;
      const [comDisciplinas] = await anexarDisciplinas([atualizado]);
      return comDisciplinas;
    });
  },

  async definirAtivo(id: string, ativo: boolean) {
    const [professor] = await db('piv.professor').where({ id }).update({ ativo, updated_at: db.fn.now() }).returning('*');
    return professor ?? null;
  },

  async buscarProfessorAtivoPorId(id: string) {
    return db('piv.professor').select('id', 'ativo').where({ id, ativo: true }).first();
  },
};
