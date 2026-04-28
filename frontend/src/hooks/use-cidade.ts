import { useState } from "react";

import { cidadeApi } from "../services/cidade-api";

export function useCidade() {
    const [carregando, setCarregando] = useState<boolean>(false)

    const listarCidades = async (params?: any) => {
        setCarregando(true)

        try {
            const response = await cidadeApi.buscarCidades(params)
            return response
        } finally {
            setCarregando(false)
        }
    }

    return {
        listarCidades,
        carregando
    }
}