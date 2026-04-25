import { db } from "../../../database/connection";
import { PessoaCommand } from "../../modulo-pessoa-usuario/models/Pessoa";
import { PessoaRepository } from "../../modulo-pessoa-usuario/repository/PessoaRepository";
import { AlunoCommand } from "../models/Aluno";
import { AlunoRepository } from "../repository/AlunoRespository";

export class AlunoService {
    alunoRepository = new AlunoRepository();
    pessoaRepository = new PessoaRepository();

    async criarAluno(data: any) {
        return await db.transaction(async (trx) => {
            
            let pessoa: PessoaCommand = {
                cpf: data.pessoa.cpf,
                nome: data.pessoa.nome,
                data_nascimento: data.pessoa.dataNascimento,
                logradouro: data.pessoa.logradouro,
                numero: data.pessoa.numero,
                bairro: data.pessoa.bairro,
                cidade_id: data.pessoa.cidadeIbge,
                estado: data.pessoa.estado,
                cep: data.pessoa.cep
            };

            const pessoaCriada = await this.pessoaRepository.criarPessoa(pessoa, trx);

            let aluno: AlunoCommand = {
                id: data.id,
                pessoa_id: pessoaCriada.id,
                usuario_id: data.usuarioId,
                periodo: data.periodo,
                curso_id: data.curso
            };

            return await this.alunoRepository.criarAluno(aluno, trx);  
        });
    }

    async listarAlunos() {
        const alunos = await this.alunoRepository.listarAlunos();
        return alunos;
    }

    async buscarAlunoPorId(id: string) {
        const aluno = await this.alunoRepository.buscarAlunoPorId(id);
        return aluno;
    }

    async buscarAlunoPorMatricula(matricula: string) {
        const aluno = await this.alunoRepository.buscarAlunoPorMatricula(matricula);
        return aluno;
    }

    async atualizarAluno(matricula: string, data: any) {
        const aluno = await this.alunoRepository.buscarAlunoPorMatricula(matricula);
        if (!aluno) return null;
        return await this.alunoRepository.atualizarAluno(matricula, data);
    }
}