import db from '../../../database/index.js';
import type { Professor, CriarProfessorDTO, AtualizarProfessor, Usuario, Pessoa } from '../models/professorModels.js';

export const professorRepository = {
  listarTodos: async () => {
    return await db('piv.professor')
      .join('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id')
      .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
      .join('piv.curso', 'piv.professor.curso_id', 'piv.curso.id')
      .join('piv.faculdade', 'piv.professor.faculdade_id', 'piv.faculdade.id')
      .select(
        'piv.professor.id',
        'piv.pessoa.nome as nome',
        'piv.usuario.email',
        'piv.pessoa.cpf',
        'piv.curso.nome as curso',
        'piv.professor.curso_id as curso_id',
        'piv.faculdade.nome as faculdade',
        'piv.professor.faculdade_id as faculdade_id'
      );
  },

  buscarPorId: async (id: string) => {
    return await db('piv.professor')
      .join('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id')
      .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
      .join('piv.curso', 'piv.professor.curso_id', 'piv.curso.id')
      .join('piv.faculdade', 'piv.professor.faculdade_id', 'piv.faculdade.id')
      .select(
        'piv.professor.id',
        'piv.professor.usuario_id',
        'piv.professor.pessoa_id',
        'piv.pessoa.nome',
        'piv.usuario.email',
        'piv.pessoa.cpf',
        'piv.pessoa.data_nascimento',
        'piv.pessoa.logradouro',
        'piv.pessoa.numero',
        'piv.pessoa.bairro',
        'piv.pessoa.cidade_id',
        'piv.pessoa.estado',
        'piv.pessoa.cep',
        'piv.professor.curso_id',
        'piv.curso.nome as curso',
        'piv.professor.faculdade_id',
        'piv.faculdade.nome as faculdade'
      )
      .where('piv.professor.id', id)
      .first();
  },

  buscarPorEmail: async (email: string) => {
    return await db('piv.usuario')
      .join('piv.professor', 'piv.professor.usuario_id', 'piv.usuario.id')
      .select('piv.professor.id')
      .where('piv.usuario.email', email)
      .first();
  },

  buscarPorCpf: async (cpf: string) => {
    return await db('piv.pessoa')
      .join('piv.professor', 'piv.professor.pessoa_id', 'piv.pessoa.id')
      .select('piv.professor.id')
      .where('piv.pessoa.cpf', cpf)
      .first();
  },

  criar: async (dados: CriarProfessorDTO) => {
    return await db.transaction(async (trx) => {
      try {
        const usuarioResult = await trx('piv.usuario').insert({
          nome: dados.nome,
          email: dados.email,
          senha: dados.senha,
          tipo_usuario: 'professor'
        }).returning('*');
        const usuario = Array.isArray(usuarioResult) ? usuarioResult[0] : usuarioResult;

        const pessoaResult = await trx('piv.pessoa').insert({
          nome: dados.nome,
          cpf: dados.cpf,
          data_nascimento: dados.data_nascimento || null,
          logradouro: dados.logradouro || '',
          numero: dados.numero || '',
          bairro: dados.bairro || '',
          cidade_id: dados.cidade_id || null,
          estado: dados.estado || '',
          cep: dados.cep || ''
        }).returning('*');
        const pessoa = Array.isArray(pessoaResult) ? pessoaResult[0] : pessoaResult;

        const professorResult = await trx('piv.professor').insert({
          usuario_id: usuario.id,
          pessoa_id: pessoa.id,
          curso_id: dados.curso_id || null,
          faculdade_id: dados.faculdade_id || null
        }).returning('*');
        const professor = Array.isArray(professorResult) ? professorResult[0] : professorResult;

        return {
          id: professor.id,
          nome: pessoa.nome,
          email: usuario.email,
          cpf: pessoa.cpf,
          curso_id: professor.curso_id,
          faculdade_id: professor.faculdade_id
        };
      } catch (erro) {
        throw erro;
      }
    });
  },

  atualizar: async (id: string, dados: AtualizarProfessor) => {
    return await db.transaction(async (trx) => {
      const professor = await trx('piv.professor').where({ id }).first();
      if (!professor) {
        return null;
      }

      if (dados.email !== undefined || dados.senha !== undefined) {
        const updateUsuario: any = {};
        if (dados.email !== undefined) updateUsuario.email = dados.email;
        if (dados.senha !== undefined) updateUsuario.senha = dados.senha;
        await trx('piv.usuario').where({ id: professor.usuario_id }).update(updateUsuario);
      }

      if (dados.nome !== undefined || dados.cpf !== undefined || dados.data_nascimento !== undefined ||
          dados.logradouro !== undefined || dados.numero !== undefined || dados.bairro !== undefined ||
          dados.cidade_id !== undefined || dados.estado !== undefined || dados.cep !== undefined) {
        const updatePessoa: any = {};
        if (dados.nome !== undefined) updatePessoa.nome = dados.nome;
        if (dados.cpf !== undefined) updatePessoa.cpf = dados.cpf;
        if (dados.data_nascimento !== undefined) updatePessoa.data_nascimento = dados.data_nascimento;
        if (dados.logradouro !== undefined) updatePessoa.logradouro = dados.logradouro;
        if (dados.numero !== undefined) updatePessoa.numero = dados.numero;
        if (dados.bairro !== undefined) updatePessoa.bairro = dados.bairro;
        if (dados.cidade_id !== undefined) updatePessoa.cidade_id = dados.cidade_id;
        if (dados.estado !== undefined) updatePessoa.estado = dados.estado;
        if (dados.cep !== undefined) updatePessoa.cep = dados.cep;
        await trx('piv.pessoa').where({ id: professor.pessoa_id }).update(updatePessoa);
      }

      const updateProfessor: any = {};
      if (dados.curso_id !== undefined) updateProfessor.curso_id = dados.curso_id;
      if (dados.faculdade_id !== undefined) updateProfessor.faculdade_id = dados.faculdade_id;
      
      if (Object.keys(updateProfessor).length > 0) {
        await trx('piv.professor').where({ id }).update(updateProfessor);
      }

      return await trx('piv.professor')
        .join('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id')
        .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
        .select('piv.professor.id', 'piv.pessoa.nome', 'piv.usuario.email', 'piv.pessoa.cpf', 'piv.professor.curso_id', 'piv.professor.faculdade_id')
        .where('piv.professor.id', id)
        .first();
    });
  },

  remover: async (id: string) => {
    return await db.transaction(async (trx) => {
      const professor = await trx('piv.professor').where({ id }).first();
      if (professor) {
        await trx('piv.professor').where({ id }).del();
        await trx('piv.pessoa').where({ id: professor.pessoa_id }).del();
        await trx('piv.usuario').where({ id: professor.usuario_id }).del();
      }
    });
  }
};
