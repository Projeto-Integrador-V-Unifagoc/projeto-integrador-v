import { useState } from "react";
import { cursoApi } from "../services/curso-api";

export function useCurso() {
    const [carregando, setCarregando] = useState<boolean>(false)

    const listarCursos = async (params?: any) => {
        setCarregando(true)

        try {
            const response = await cursoApi.buscarCursos(params)
            return response
        } finally {
            setCarregando(false)
        }
    }

    return {
        listarCursos,
        carregando
    }
}