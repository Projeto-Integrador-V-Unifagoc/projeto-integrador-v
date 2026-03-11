import { Pessoa } from "../models/Pessoa";
import { PessoaRepository } from "../repository/PessoaRepository";

export class PessoaService {
    private pessoaRepository = new PessoaRepository()

    async criarPessoa(data: Pessoa){
        return await this.pessoaRepository.criarPessoa(data)
    }

    async listarPessoas(){
        return await this.pessoaRepository.listarPessoas()
    }

    async buscarPessoaPorCpf(cpf: string){
        return await this.pessoaRepository.buscarPessoaPorCpf(cpf)
    }
}