import { api } from "../lib/axios";

export const cidadeApi = {
    async buscarCidades(params?: { ibge?: string }) {
        const response = await api.get("/cidades", { params })
        return response.data
    },

    async buscarCidadePorIbge(ibge: string) {
        const response = await api.get(`/cidades/${ibge}`)
        return response.data
    }
}