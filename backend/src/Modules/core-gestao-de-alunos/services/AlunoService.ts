import { AlunoRepository } from "../repository/AlunoRepository"
import { PessoaRepository } from "../repository/PessoaRepository"
import { UsuarioRepository } from "../repository/UsuarioRepository"

import { Aluno } from "../models/Aluno"

import { randomUUID } from 'node:crypto'


export class AlunoService {

    private alunoRepository = new AlunoRepository()
    private pessoaRepository = new PessoaRepository()
    private usuarioRepository = new UsuarioRepository()

    async criarAluno(data: Aluno){

        const usuarioId = randomUUID()

        const usuario = await this.usuarioRepository.criariUsuario({
            id: usuarioId,
            email: data.usuario.email,
            tipo_usuario: data.usuario.tipo_usuario,
            password: data.usuario.password,
            created_at: new Date(),
            updated_at: new Date()
        })

        const pessoa = await this.pessoaRepository.criarPessoa({
            cpf: data.pessoa.cpf,
            nome: data.pessoa.nome,
            data_nascimento: data.pessoa.data_nascimento,
            logradouro: data.pessoa.logradouro,
            numero: data.pessoa.numero,
            bairro: data.pessoa.bairro,
            cidade: data.pessoa.cidade,
            estado: data.pessoa.estado,
            cep: data.pessoa.cep
        })

        const aluno = await this.alunoRepository.criarAluno({
            matricula: data.matricula,
            usuario_id: usuario.id,
            pessoa_id: pessoa.cpf,
            periodo: data.periodo
        })

        return {
            usuario,
            pessoa,
            aluno
        }
    }

    async listarAlunos(){
        const alunos = await this.alunoRepository.listarAlunos()
        const alunosComDetalhes = await Promise.all(alunos.map(async (aluno) => {
            const pessoa = await this.pessoaRepository.buscarPessoaPorCpf(aluno.pessoa_id)
            const usuario = await this.usuarioRepository.buscarUsuarioPorId(aluno.usuario_id)
            return {
                matricula: aluno.matricula,
                periodo: aluno.periodo,
                pessoa: {
                    cpf: pessoa?.cpf,
                    nome: pessoa?.nome,
                    data_nascimento: pessoa?.data_nascimento,
                    logradouro: pessoa?.logradouro,
                    numero: pessoa?.numero,
                    bairro: pessoa?.bairro,
                    cidade: pessoa?.cidade,
                    estado: pessoa?.estado,
                    cep: pessoa?.cep
                },
                usuario: {
                    email: usuario?.email,
                    tipo_usuario: usuario?.tipo_usuario
                }
            }
        }))
        return alunosComDetalhes
    }

    async buscarAlunoPorMatricula(matricula: string){
        const aluno = await this.alunoRepository.buscarAlunoPorMatricula(matricula)
        const alunosComDetalhes = await Promise.all(aluno.map(async (aluno) => {
            const pessoa = await this.pessoaRepository.buscarPessoaPorCpf(aluno.pessoa_id)
            const usuario = await this.usuarioRepository.buscarUsuarioPorId(aluno.usuario_id)
            return {
                matricula: aluno.matricula,
                periodo: aluno.periodo,
                pessoa: {
                    cpf: pessoa?.cpf,
                    nome: pessoa?.nome,
                    data_nascimento: pessoa?.data_nascimento,
                    logradouro: pessoa?.logradouro,
                    numero: pessoa?.numero,
                    bairro: pessoa?.bairro,
                    cidade: pessoa?.cidade,
                    estado: pessoa?.estado,
                    cep: pessoa?.cep
                },
                usuario: {
                    email: usuario?.email,
                    tipo_usuario: usuario?.tipo_usuario
                }
            }
        }))
        return alunosComDetalhes[0]
    }
    
}