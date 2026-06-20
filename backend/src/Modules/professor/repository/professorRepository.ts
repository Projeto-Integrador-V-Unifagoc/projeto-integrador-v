import { db } from '../../../database/connection.js';
import type { AtualizarProfessor, CriarProfessorDTO, FiltroProfessor } from '../models/professorModels.js';

const baseQuery = () => db('piv.professor')
  .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
  .join('piv.curso', 'piv.professor.curso_id', 'piv.curso.id')
  .join('piv.faculdade', 'piv.professor.faculdade_id', 'piv.faculdade.id')
  .leftJoin('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id');

const camposCompletos = [
  'piv.professor.id', 'piv.professor.usuario_id', 'piv.professor.pessoa_id',
  'piv.professor.ativo', 'piv.pessoa.nome', 'piv.usuario.email', 'piv.pessoa.cpf',
  'piv.pessoa.data_nascimento', 'piv.pessoa.logradouro', 'piv.pessoa.numero',
  'piv.pessoa.bairro', 'piv.pessoa.cidade_id', 'piv.pessoa.estado', 'piv.pessoa.cep',
  'piv.professor.curso_id', 'piv.curso.nome as curso', 'piv.professor.faculdade_id',
  'piv.faculdade.nome as faculdade',
];

export const professorRepository = {
  async listarTodos(filtro: FiltroProfessor = {}) {
    const query = baseQuery().select(camposCompletos).orderBy('piv.pessoa.nome');
    if (filtro.ativo !== undefined) query.where('piv.professor.ativo', filtro.ativo);
    return query;
  },

  async listarOpcoes() {
    return baseQuery()
      .where('piv.professor.ativo', true)
      .select('piv.professor.id', 'piv.pessoa.nome', 'piv.curso.id as curso_id', 'piv.curso.nome as curso_nome')
      .orderBy('piv.pessoa.nome');
  },

  async buscarPorId(id: string) {
    return baseQuery().select(camposCompletos).where('piv.professor.id', id).first();
  },

  async buscarPorCpf(cpf: string) {
    return db('piv.pessoa').join('piv.professor', 'piv.professor.pessoa_id', 'piv.pessoa.id')
      .select('piv.professor.id').where('piv.pessoa.cpf', cpf).first();
  },

  async buscarCursoComFaculdade(id: string) {
    return db('piv.curso').join('piv.departamento', 'piv.curso.departamento_id', 'piv.departamento.id')
      .select('piv.curso.id', 'piv.departamento.faculdade_id').where('piv.curso.id', id).first();
  },

  async buscarCidadePorIbge(ibge: string) {
    return db('piv.cidade').select('ibge', 'uf').where({ ibge }).first();
  },

  async criar(dados: CriarProfessorDTO & { faculdade_id: string }) {
    return db.transaction(async (trx) => {
      const [pessoa] = await trx('piv.pessoa').insert({
        nome: dados.nome, cpf: dados.cpf, data_nascimento: dados.data_nascimento,
        logradouro: dados.logradouro, numero: dados.numero, bairro: dados.bairro,
        cidade_id: dados.cidade_id, estado: dados.estado, cep: dados.cep,
      }).returning('*');
      const [professor] = await trx('piv.professor').insert({
        usuario_id: null, pessoa_id: pessoa.id, curso_id: dados.curso_id,
        faculdade_id: dados.faculdade_id, ativo: true,
      }).returning('*');
      return { ...professor, nome: pessoa.nome, cpf: pessoa.cpf };
    });
  },

  async atualizar(id: string, dados: AtualizarProfessor & { faculdade_id?: string }) {
    return db.transaction(async (trx) => {
      const professor = await trx('piv.professor').where({ id }).first();
      if (!professor) return null;
      const pessoa: Record<string, unknown> = {};
      for (const campo of ['nome', 'cpf', 'data_nascimento', 'logradouro', 'numero', 'bairro', 'cidade_id', 'estado', 'cep'] as const) {
        if (dados[campo] !== undefined) pessoa[campo] = dados[campo];
      }
      if (Object.keys(pessoa).length) await trx('piv.pessoa').where({ id: professor.pessoa_id }).update(pessoa);
      const academico: Record<string, unknown> = {};
      if (dados.curso_id !== undefined) academico.curso_id = dados.curso_id;
      if (dados.faculdade_id !== undefined) academico.faculdade_id = dados.faculdade_id;
      if (Object.keys(academico).length) await trx('piv.professor').where({ id }).update(academico);
      if (dados.nome !== undefined && professor.usuario_id) {
        await trx('piv.usuario').where({ id: professor.usuario_id }).update({ nome: dados.nome, updated_at: trx.fn.now() });
      }
      return trx('piv.professor')
        .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
        .join('piv.curso', 'piv.professor.curso_id', 'piv.curso.id')
        .join('piv.faculdade', 'piv.professor.faculdade_id', 'piv.faculdade.id')
        .leftJoin('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id')
        .select(camposCompletos).where('piv.professor.id', id).first();
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
