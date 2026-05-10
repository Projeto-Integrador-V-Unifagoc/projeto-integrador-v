import { useState } from "react";

import { cidadeApi } from "../services/cidade-api";

export function useCidade() {
    const [carregando, setCarregando] = useState<boolean>(false)

    const listarCidades = async (params?: {
        ibge?: string
        nome?: string
    }) => {
        setCarregando(true)

        try {
            const response = await cidadeApi.buscarCidades(params)
            return response
        } finally {
            setCarregando(false)
        }
    }

    const buscarCidadePorIbge = async (ibge: string) => {
        setCarregando(true)

        try {
            const response = await cidadeApi.buscarCidadePorIbge(ibge)
            return response
        } finally {
            setCarregando(false)
        }
    }

    return {
        buscarCidadePorIbge,
        listarCidades,
        carregando
    }
}