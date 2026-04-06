import { AlunoRepository } from "../repository/AlunoRepository"
import { PessoaRepository } from "../repository/PessoaRepository"
import { UsuarioRepository } from "../repository/UsuarioRepository"

import { Aluno } from "../models/Aluno"

import { randomUUID } from 'node:crypto'
import { PessoaService } from "./PessoaService"


export class AlunoService {

    private alunoRepository = new AlunoRepository()
    private pessoaService = new PessoaService()
    private usuarioService = new UsuarioRepository()

    async criarAluno(data: Aluno){

        const usuarioId = randomUUID()

        const usuario = await this.usuarioService.criariUsuario(data.usuario)

        const pessoa = await this.pessoaService.criarPessoa(data.pessoa)

        const aluno = await this.alunoRepository.criarAluno({
            matricula: data.matricula,
            usuario: data.usuario,
            pessoa: data.pessoa,
            periodo: data.periodo,
            curso: data.curso
        })

            }

    async listarAlunos(){
        const alunos = await this.alunoRepository.listarAlunos()
        const alunosComDetalhes = await Promise.all(alunos.map(async (aluno) => {
            const pessoa = await this.pessoaService.buscarPessoaPorCpf(aluno.pessoa_id)
            const usuario = await this.usuarioService.buscarUsuarioPorId(aluno.usuario_id)
            return {
                matricula: aluno.matricula,
                periodo: aluno.periodo,
                pessoa: pessoa,
                usuario: usuario,
                curso: aluno.curso
            }
        }))
        return alunosComDetalhes
    }

    async buscarAlunoPorMatricula(matricula: string){
        const aluno = await this.alunoRepository.buscarAlunoPorMatricula(matricula)
        const alunosComDetalhes = await Promise.all(aluno.map(async (aluno) => {
            const pessoa = await this.pessoaService.buscarPessoaPorCpf(aluno.pessoa_id)
            const usuario = await this.usuarioService.buscarUsuarioPorId(aluno.usuario_id)
            return {
                matricula: aluno.matricula,
                periodo: aluno.periodo,
                pessoa: pessoa,
                usuario: usuario,
                curso: aluno.curso
            }
        }))
        return alunosComDetalhes[0]
    }
}