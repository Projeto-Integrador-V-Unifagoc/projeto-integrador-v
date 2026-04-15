import { UsuarioCommand } from "../models/Usuario";
import { UsuarioRepository } from "../repository/UsuarioRepository";

export class UsuarioService {
    usuarioRepository = new UsuarioRepository();

    async criarUsuario(data: any) {
        let usuario: UsuarioCommand = {
            id: data.id,
            email: data.email,
            senha: data.senha,
            tipo_usuario: data.tipoUsuario,
            created_at: new Date(),
            updated_at: new Date()
        };
        return await this.usuarioRepository.criarUsuario(usuario);
    }

    async listarUsuarios() {
        const usuarios = await this.usuarioRepository.listarUsuarios();
        return usuarios;
    }

    async buscarUsuarioPorId(id: string) {
        const usuario = await this.usuarioRepository.buscarUsuarioPorId(id);
        return usuario;
    }
}