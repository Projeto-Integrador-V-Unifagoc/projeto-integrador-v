import { api } from "../lib/axios";
import type { CriarAlunoRequest } from "../models/aluno-model";

export const alunoApi = {
    async criarAluno(data: CriarAlunoRequest) {
        const payload = {
            periodo: data.periodo,
            pessoa: {
                cpf: data.pessoa.cpf,
                nome: data.pessoa.nome,
                dataNascimento: data.pessoa.dataNascimento,
                logradouro: data.pessoa.logradouro,
                numero: data.pessoa.numero,
                bairro: data.pessoa.bairro,
                cidadeIbge: data.pessoa.cidadeIbge,
                estado: data.pessoa.estado,
                cep: data.pessoa.cep,
            }
        }
        
        const response = await api.post("/alunos", payload)
        return response.data
    },

    async buscarAluno (params?: { id?: string, matricula?: string, nome?: string, cursoId?: string, periodo?: string }) {
        const response = await api.get("alunos", { params })
        return response.data
    },

    async buscarAlunoPorMatricula(matricula: string) {
        const response = await api.get(`/alunos/${matricula}`)
        return response.data
    },

    async buscarAlunoPorId(id: string) {
        const response = await api.get(`/alunos/id/${id}`)
        return response.data
    }
}
