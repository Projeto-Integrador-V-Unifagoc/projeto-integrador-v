import { Usuario } from "../models/Usuario";
import { UsuarioRepository } from "../repository/UsuarioRepository";

export class UsuarioService {
    
    usuarioRepository = new UsuarioRepository()

    async criarUsuario(data: Usuario){
        return await this.usuarioRepository.criariUsuario(data)
    }
}