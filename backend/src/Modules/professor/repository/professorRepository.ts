import db from '../../database';
import type { Professor, CriarProfessorDTO, AtualizarProfessor, Usuario, Pessoa } from '../models/professorModels';

export const professorRepository = {
  listarTodos: async () => {
    return await db('professores')
      .join('usuarios', 'professores.usuario_id', 'usuarios.id')
      .join('pessoas', 'professores.pessoa_id', 'pessoas.id')
      .select('professores.id', 'pessoas.nome', 'usuarios.email', 'pessoas.cpf', 'professores.curso_id', 'professores.faculdade_id');
  },

  buscarPorId: async (id: number) => {
    return await db('professores')
      .join('usuarios', 'professores.usuario_id', 'usuarios.id')
      .join('pessoas', 'professores.pessoa_id', 'pessoas.id')
      .select('professores.id', 'professores.usuario_id', 'professores.pessoa_id', 'pessoas.nome', 'usuarios.email', 'pessoas.cpf', 'professores.curso_id', 'professores.faculdade_id')
      .where('professores.id', id)
      .first();
  },

  buscarPorEmail: async (email: string) => {
    return await db('usuarios')
      .join('professores', 'professores.usuario_id', 'usuarios.id')
      .select('professores.id')
      .where('usuarios.email', email)
      .first();
  },

  buscarPorCpf: async (cpf: string) => {
    return await db('pessoas')
      .join('professores', 'professores.pessoa_id', 'pessoas.id')
      .select('professores.id')
      .where('pessoas.cpf', cpf)
      .first();
  },

  criar: async (dados: CriarProfessorDTO) => {
    return await db.transaction(async (trx) => {
      const [usuario] = await trx('usuarios').insert({
        email: dados.email,
        senha: dados.senha,
        tipo_usuario: 'professor'
      }).returning('*');

      const [pessoa] = await trx('pessoas').insert({
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

      const [professor] = await trx('professores').insert({
        usuario_id: usuario.id,
        pessoa_id: pessoa.id,
        curso_id: dados.curso_id || null,
        faculdade_id: dados.faculdade_id || null
      }).returning('*');

      return {
        id: professor.id,
        nome: pessoa.nome,
        email: usuario.email,
        cpf: pessoa.cpf,
        curso_id: professor.curso_id,
        faculdade_id: professor.faculdade_id
      };
    });
  },

  atualizar: async (id: number, dados: AtualizarProfessor) => {
    return await db.transaction(async (trx) => {
      const professor = await trx('professores').where({ id }).first();
      if (!professor) return null;

      if (dados.email || dados.senha) {
        const updateUsuario: any = {};
        if (dados.email) updateUsuario.email = dados.email;
        if (dados.senha) updateUsuario.senha = dados.senha;
        await trx('usuarios').where({ id: professor.usuario_id }).update(updateUsuario);
      }

      if (dados.nome || dados.cpf || dados.data_nascimento || dados.logradouro || dados.numero || dados.bairro || dados.cidade_id || dados.estado || dados.cep) {
        const updatePessoa: any = {};
        if (dados.nome) updatePessoa.nome = dados.nome;
        if (dados.cpf) updatePessoa.cpf = dados.cpf;
        if (dados.data_nascimento) updatePessoa.data_nascimento = dados.data_nascimento;
        if (dados.logradouro) updatePessoa.logradouro = dados.logradouro;
        if (dados.numero) updatePessoa.numero = dados.numero;
        if (dados.bairro) updatePessoa.bairro = dados.bairro;
        if (dados.cidade_id) updatePessoa.cidade_id = dados.cidade_id;
        if (dados.estado) updatePessoa.estado = dados.estado;
        if (dados.cep) updatePessoa.cep = dados.cep;
        await trx('pessoas').where({ id: professor.pessoa_id }).update(updatePessoa);
      }

      const updateProfessor: any = {};
      if (dados.curso_id !== undefined) updateProfessor.curso_id = dados.curso_id;
      if (dados.faculdade_id !== undefined) updateProfessor.faculdade_id = dados.faculdade_id;
      
      if (Object.keys(updateProfessor).length > 0) {
        await trx('professores').where({ id }).update(updateProfessor);
      }

      return await trx('professores')
        .join('usuarios', 'professores.usuario_id', 'usuarios.id')
        .join('pessoas', 'professores.pessoa_id', 'pessoas.id')
        .select('professores.id', 'pessoas.nome', 'usuarios.email', 'pessoas.cpf', 'professores.curso_id', 'professores.faculdade_id')
        .where('professores.id', id)
        .first();
    });
  },

  remover: async (id: number) => {
    return await db.transaction(async (trx) => {
      const professor = await trx('professores').where({ id }).first();
      if (professor) {
        await trx('professores').where({ id }).del();
        await trx('pessoas').where({ id: professor.pessoa_id }).del();
        await trx('usuarios').where({ id: professor.usuario_id }).del();
      }
    });
  }
};