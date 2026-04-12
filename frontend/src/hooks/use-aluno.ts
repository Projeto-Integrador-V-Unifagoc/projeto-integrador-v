import { useState } from "react";
import type { CriarAlunoRequest } from "../models/aluno-model";
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

    return {
        criarAluno,
        listarAlunos,
        carregando
    }
}