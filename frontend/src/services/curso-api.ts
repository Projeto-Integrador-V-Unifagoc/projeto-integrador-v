import { api } from "../lib/axios"
import type { CriarCursoRequest } from "../models/curso-model"

export const cursoApi = {
  async listarCursos() {
    const response = await api.get("/cursos")
    return response.data
  },

  async buscarCursoPorId(id: string) {
    const response = await api.get(`/cursos/${id}`)
    return response.data
  },

  async criarCurso(data: CriarCursoRequest) {
    const response = await api.post("/cursos", data)
    return response.data
  },

  async atualizarCurso(id: string, data: CriarCursoRequest) {
    const response = await api.put(`/cursos/${id}`, data)
    return response.data
  },

  async removerCurso(id: string) {
    const response = await api.delete(`/cursos/${id}`)
    return response.data
  },
}
