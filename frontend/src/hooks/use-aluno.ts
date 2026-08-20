import { useState } from "react";
import type { AlunoResponse, CriarAlunoRequest } from "../models/aluno-model";
import { alunoApi } from "../services/aluno-api";

export function useAluno() {
    const [carregando, setCarregando] = useState<boolean>(false)

    const criarAluno = async (data: CriarAlunoRequest) => {
        setCarregando(true)

        try {
            const response = await alunoApi.criarAluno(data)
            return response
        } finally {
            setCarregando(false)
        }
    }

    const listarAlunos = async (params?: any) => {
        setCarregando(true)

        try {
            const response = await alunoApi.buscarAluno(params)
            return response
        } finally {
            setCarregando(false)
        }
    }
    
    const buscarAlunoPorMatricula = async (matricula: string): Promise<AlunoResponse> => {
        setCarregando(true)

        try {
            const response = await alunoApi.buscarAlunoPorMatricula(matricula)
            return response
        } finally {
            setCarregando(false)
        }
    }

    const atualizarAluno = async (matricula: string, data: any) => {
        setCarregando(true)

        try {
            const response = await alunoApi.atualizarAluno(matricula, data)
            return response
        } finally {
            setCarregando(false)
        }
    }

    return {
        buscarAlunoPorMatricula,
        listarAlunos,
        criarAluno,
        atualizarAluno,
        carregando
    }
}