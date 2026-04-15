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

export class UsuarioMapper {
  static toDomain(raw: any): Usuario {
    return {
      id: raw.u_id,
      email: raw.u_email,
      senha: raw.u_senha,
      tipoUsuario: raw.u_tipo_usuario,
      createdAt: raw.u_created_at,
      updatedAt: raw.u_updated_at,
    };
  }
}