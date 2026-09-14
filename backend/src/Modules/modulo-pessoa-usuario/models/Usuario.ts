export interface Usuario {
  id: string;
  email: string;
  senha: string;
  tipoUsuario: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsuarioCommand {
  id: string;
  email: string;
  senha: string;
  tipo_usuario: string;
  created_at: Date;
  updated_at: Date;
}

interface RawUsuario {
  u_id?: string;
  u_email?: string;
  u_senha?: string;
  u_tipo_usuario?: string;
  u_created_at?: Date;
  u_updated_at?: Date;
}

export class UsuarioMapper {
  static toDomain(raw: RawUsuario): Usuario {
    return {
      id: raw.u_id as string,
      email: raw.u_email as string,
      senha: raw.u_senha as string,
      tipoUsuario: raw.u_tipo_usuario as string,
      createdAt: raw.u_created_at as Date,
      updatedAt: raw.u_updated_at as Date,
    };
  }
}