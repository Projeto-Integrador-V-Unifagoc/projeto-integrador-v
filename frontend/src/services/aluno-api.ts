import { api } from "../lib/axios";
import type { AlunoRequest } from "../models/aluno-model";

export const alunoApi = {
    async criarAluno(data: AlunoRequest) {
        const payload = {
            matricula: data.matricula,
            periodo: data.periodo,
            pessoa: {
                cpf: data.pessoa.cpf,
                nome: data.pessoa.nome,
                data_nascimento: data.pessoa.dataNascimento,
                logradouro: data.pessoa.logradouro,
                numero: data.pessoa.numero,
                bairro: data.pessoa.bairro,
                cidadeIbge: data.pessoa.cidade.igbe,
                estado: data.pessoa.estado,
                cep: data.pessoa.cep,
            },
            usuario: {
                email: data.usuario.email,
                tipo_usuario: data.usuario.tipoUsuario,
                senha: data.usuario.senha
            }
        }
        
        const response = await api.post("/alunos", payload)
        return response.data
    },

    async buscarAluno (params?: { id?: string, matricula?: string, nome?: string }) {
        const response = await api.get("alunos", { params })
        return response.data
    }
}