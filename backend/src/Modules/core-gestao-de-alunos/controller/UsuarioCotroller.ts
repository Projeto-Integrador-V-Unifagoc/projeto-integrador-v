import { Request, Response } from "express";
import { UsuarioService } from "../services/UsuarioService";
import { Usuario } from "../models/Usuario";

export class UsuarioController {

    private usuarioService = new UsuarioService()
    
    async criarUsuario(req: Request<{}, {}, Usuario>, res: Response){
        
        const usuario =  await this.usuarioService.criarUsuario(req.body)

        return res.status(201).json(usuario)
    }
}