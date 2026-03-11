import { Usuario } from "../models/Usuario";
import { UsuarioRepository } from "../repository/UsuarioRepository";

export class UsuarioService {
    
    usuarioRepository = new UsuarioRepository()

    async criarUsuario(data: Usuario){
        return await this.usuarioRepository.criariUsuario(data)
    }
    async listarUsuarios(){
        return await this.usuarioRepository.listarUsuarios()
    }

    async buscarUsuarioPorEmail(email: string){
        return await this.usuarioRepository.buscarUsuarioPorEmail(email)
    }

    async buscarUsuarioPorId(id: string){
        return await this.usuarioRepository.buscarUsuarioPorId(id)
    }
}