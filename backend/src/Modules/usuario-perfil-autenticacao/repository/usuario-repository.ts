import db from '../../../database/conexao';

export interface Usuario {
  id?: string;
  nome: string;
  email: string;
  senha: string;
  perfil: 'aluno' | 'professor' | 'secretaria';
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface IUsuarioRepository {
  create(dados: Usuario): Promise<Usuario>;
  findByEmail(email: string): Promise<Usuario | null>;
  findById(id: string): Promise<Usuario | null>;
}

export class UsuarioRepository implements IUsuarioRepository {
  async create(usuario: Usuario): Promise<Usuario> {
    const [novoUsuario] = await db<Usuario>('usuarios')
      .insert(usuario)
      .returning('*');

    return novoUsuario;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const usuario = await db<Usuario>('usuarios')
      .where({ email })
      .first();

    return usuario || null;
  }

  async findById(id: string): Promise<Usuario | null> {
    const usuario = await db<Usuario>('usuarios')
      .where({ id })
      .first();

    return usuario || null;
  }
}