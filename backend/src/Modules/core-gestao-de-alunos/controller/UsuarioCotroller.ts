import { Request, Response } from "express";
import { UsuarioService } from "../services/UsuarioService";
import { Usuario } from "../models/Usuario";

export class UsuarioController {

    private usuarioService = new UsuarioService()
    
    async criarUsuario(req: Request<{}, {}, Usuario>, res: Response){
        
        const usuario =  await this.usuarioService.criarUsuario(req.body)

        return res.status(201).json(usuario)
    }

    async listarUsuarios(req: Request, res: Response) {
        const usuarios = await this.usuarioService.listarUsuarios()
        return res.status(200).json(usuarios)
    }
    
    async buscarUsuarioPorEmail(req: Request<{ email: string }>, res: Response) {
        const { email } = req.params
        const usuario = await this.usuarioService.buscarUsuarioPorEmail(email)
        if (!usuario) {
            return res.status(404).json({ message: "Usuário não encontrado" })
        }
        return res.status(200).json(usuario)
    }
}