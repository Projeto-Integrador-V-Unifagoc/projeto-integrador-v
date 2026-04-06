import { Request, Response } from "express";
import { PessoaService } from "../services/PessoaService";
import { Pessoa } from "../models/Pessoa";

export class PessoaController {
    
    private pessoaService = new PessoaService()

    async criarPessoa(req: Request<{}, {}, Pessoa>, res: Response) {
        
        const pessoa = await this.pessoaService.criarPessoa(req.body)

        return res.status(201).json(pessoa)
    }

    async listarPessoas(req: Request, res: Response) {
        
        const pessoas = await this.pessoaService.listarPessoas()
        return res.status(200).json(pessoas)
    }

    async buscarPessoaPorCpf(req: Request<{ cpf: string }>, res: Response) {
        const { cpf } = req.params
        const pessoa = await this.pessoaService.buscarPessoaPorCpf(cpf)
        if (!pessoa) {
            return res.status(404).json({ message: "Pessoa não encontrada" })
        }
        return res.status(200).json(pessoa)
    }
}