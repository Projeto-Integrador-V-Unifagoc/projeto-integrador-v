import { db } from '../../../database/connection';
import knex from 'knex';

export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  senha: string;
  tipo_usuario: 'aluno' | 'professor' | 'secretaria';
  created_at?: Date;
  updated_at?: Date;
}

export class UsuarioRepository {
  async create(usuario: Usuario): Promise<Usuario> {
    const result = await db
      .withSchema('piv')
      .table('usuario')
      .insert(usuario)
      .returning('*');

    return result[0] as Usuario;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const usuario = await db
      .withSchema('piv')
      .table('usuario')
      .where({ email })
      .first();

    return usuario || null;
  }

  async findById(id: number): Promise<Usuario | null> {
    const usuario = await db
      .withSchema('piv')
      .table('usuario')
      .where({ id })
      .first();

    return usuario || null;
  }

  async buscarPorId(id: string) {
    return await db('piv.usuario')
      .select('id', 'nome', 'email', 'tipo_usuario', 'created_at')
      .where({ id })
      .first();
  }

  // Busca o aluno vinculado a um usuário (aluno.usuario_id), trazendo pessoa e curso.
  async buscarAlunoPorUsuario(usuarioId: string) {
    return await db('piv.aluno')
      .leftJoin('piv.pessoa', 'aluno.pessoa_id', 'pessoa.id')
      .leftJoin('piv.curso', 'aluno.curso_id', 'curso.id')
      .where('aluno.usuario_id', usuarioId)
      .select(
        'aluno.id as vinculo_id',
        'aluno.periodo',
        'pessoa.nome as pessoa_nome',
        'pessoa.cpf',
        'pessoa.data_nascimento',
        'pessoa.logradouro',
        'pessoa.numero',
        'pessoa.bairro',
        'pessoa.estado',
        'pessoa.cep',
        'curso.nome as curso_nome',
        'curso.codigo as curso_codigo'
      )
      .first();
  }

  // Busca o professor vinculado a um usuário (professor.usuario_id), trazendo pessoa, curso e faculdade.
  async buscarProfessorPorUsuario(usuarioId: string) {
    return await db('piv.professor')
      .leftJoin('piv.pessoa', 'professor.pessoa_id', 'pessoa.id')
      .leftJoin('piv.curso', 'professor.curso_id', 'curso.id')
      .leftJoin('piv.faculdade', 'professor.faculdade_id', 'faculdade.id')
      .where('professor.usuario_id', usuarioId)
      .select(
        'professor.id as vinculo_id',
        'pessoa.nome as pessoa_nome',
        'pessoa.cpf',
        'pessoa.data_nascimento',
        'pessoa.logradouro',
        'pessoa.numero',
        'pessoa.bairro',
        'pessoa.estado',
        'pessoa.cep',
        'curso.nome as curso_nome',
        'curso.codigo as curso_codigo',
        'faculdade.nome as faculdade_nome'
      )
      .first();
  }

  // Lista alunos que ainda não possuem login vinculado (usuario_id nulo).
  async listarAlunosSemUsuario() {
    return await db('piv.aluno')
      .leftJoin('piv.pessoa', 'aluno.pessoa_id', 'pessoa.id')
      .whereNull('aluno.usuario_id')
      .select('aluno.id', 'pessoa.nome as nome', 'pessoa.cpf as cpf')
      .orderBy('pessoa.nome');
  }

  // Busca enxuta do aluno (id + usuario_id) para validar o vínculo.
  async buscarAlunoSimples(alunoId: string) {
    return await db('piv.aluno')
      .select('id', 'usuario_id')
      .where({ id: alunoId })
      .first();
  }

  // Vincula um aluno a um usuário (define aluno.usuario_id).
  async vincularUsuarioAoAluno(alunoId: string, usuarioId: string) {
    return await db('piv.aluno')
      .where({ id: alunoId })
      .update({ usuario_id: usuarioId });
  }

  // Lista professores que ainda não possuem login vinculado (usuario_id nulo).
  async listarProfessoresSemUsuario() {
    return await db('piv.professor')
      .leftJoin('piv.pessoa', 'professor.pessoa_id', 'pessoa.id')
      .whereNull('professor.usuario_id')
      .select('professor.id', 'pessoa.nome as nome', 'pessoa.cpf as cpf')
      .orderBy('pessoa.nome');
  }

  // Busca enxuta do professor (id + usuario_id) para validar o vínculo.
  async buscarProfessorSimples(professorId: string) {
    return await db('piv.professor')
      .select('id', 'usuario_id')
      .where({ id: professorId })
      .first();
  }

  // Vincula um professor a um usuário (define professor.usuario_id).
  async vincularUsuarioAoProfessor(professorId: string, usuarioId: string) {
    return await db('piv.professor')
      .where({ id: professorId })
      .update({ usuario_id: usuarioId });
  }

  // Remove o vínculo de qualquer aluno apontando para este usuário (usuario_id -> null).
  async desvincularAlunosDoUsuario(usuarioId: string) {
    return await db('piv.aluno')
      .where({ usuario_id: usuarioId })
      .update({ usuario_id: null });
  }

  // Remove o vínculo de qualquer professor apontando para este usuário (usuario_id -> null).
  async desvincularProfessoresDoUsuario(usuarioId: string) {
    return await db('piv.professor')
      .where({ usuario_id: usuarioId })
      .update({ usuario_id: null });
  }

  // Atualiza os dados básicos do usuário (nome, email, senha, tipo_usuario).
  async update(id: string, dados: Partial<Usuario>) {
    return await db('piv.usuario')
      .where({ id })
      .update(dados);
  }

  async findAll(): Promise<any[]> {
    // Traz, junto de cada usuário, o aluno/professor vinculado (id + nome),
    // para que a edição já saiba qual vínculo está ativo.
    return await db('piv.usuario')
      .leftJoin('piv.aluno', 'aluno.usuario_id', 'usuario.id')
      .leftJoin('piv.professor', 'professor.usuario_id', 'usuario.id')
      .leftJoin('piv.pessoa as pessoa_aluno', 'aluno.pessoa_id', 'pessoa_aluno.id')
      .leftJoin('piv.pessoa as pessoa_professor', 'professor.pessoa_id', 'pessoa_professor.id')
      .select(
        'usuario.id',
        'usuario.nome',
        'usuario.email',
        'usuario.tipo_usuario',
        'aluno.id as aluno_id',
        'pessoa_aluno.nome as aluno_nome',
        'pessoa_aluno.cpf as aluno_cpf',
        'professor.id as professor_id',
        'pessoa_professor.nome as professor_nome',
        'pessoa_professor.cpf as professor_cpf'
      );
  }
  
  async delete(id: string | number): Promise<void> {
    await db
      .withSchema('piv')
      .table('usuario')
      .where({ id })
      .del(); // Comando para apagar do banco
  }

}