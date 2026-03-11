import { Request, Response } from "express";
import { PessoaService } from "../services/PessoaService";
import { Pessoa } from "../models/Pessoa";

export class PessoaController {
    
    private pessoaService = new PessoaService()

    async criarPessoa(req: Request<{}, {}, Pessoa>, res: Response) {
        
        const pessoa = await this.pessoaService.criarPessoa(req.body)

        return res.status(201).json(pessoa)
    }
}