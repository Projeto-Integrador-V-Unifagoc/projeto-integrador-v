import { useState } from "react";
import type { AlunoRequest } from "../models/aluno-model";
import { alunoApi } from "../services/aluno-api";

export function useAluno() {
    const [carregando, setCarregando] = useState<boolean>(false)

    const criarAluno = async (data: AlunoRequest) => {
        setCarregando(true)

        try {
            const response = await alunoApi.criarAluno(data)
            return response
        } finally {
            setCarregando(false)
        }
    }

    return {
        criarAluno,
        carregando
    }
}