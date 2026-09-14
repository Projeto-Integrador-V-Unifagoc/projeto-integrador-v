import { PessoaCommand } from "../models/Pessoa";
import { PessoaRepository } from "../repository/PessoaRepository";
import { v4 as uuidv4 } from 'uuid';

interface CriarPessoaInput {
    cpf: string;
    nome: string;
    dataNascimento: string;
    logradouro: string;
    numero: number;
    bairro: string;
    cidadeIbge: string;
    estado: string;
    cep: string;
}

export class PessoaService {
    pessoaRepository = new PessoaRepository();

    async criarPessoa(data: CriarPessoaInput) {
        let pessoa: PessoaCommand = {
            id: uuidv4(),
            cpf: data.cpf,
            nome: data.nome,
            data_nascimento: data.dataNascimento,
            logradouro: data.logradouro,
            numero: data.numero,
            bairro: data.bairro,
            cidade_id: data.cidadeIbge,
            estado: data.estado,
            cep: data.cep
        };

        return await this.pessoaRepository.criarPessoa(pessoa);
    }

    async listarPessoas() {
        const pessoas = await this.pessoaRepository.listarPessoas();
        return pessoas;
    }

    async buscarPessoaPorId(id: string) {
        const pessoa = await this.pessoaRepository.buscarPessoaPorId(id);
        return pessoa;
    }
}