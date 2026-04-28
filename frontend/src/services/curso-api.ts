import { api } from "../lib/axios"

export const cursoApi = {
    async buscarCursos (params?: { nome?: string }) {
        const response = await api.get("/cursos", { params })
        return response.data
    }
}