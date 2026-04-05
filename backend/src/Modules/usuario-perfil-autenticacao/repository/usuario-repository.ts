import db from '../../../database/conexao';

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
}