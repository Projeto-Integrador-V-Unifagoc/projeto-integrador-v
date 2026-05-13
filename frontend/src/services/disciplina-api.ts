import { api } from "../lib/axios"
import type { CriarDisciplinaRequest } from "../models/disciplina-model"

export const disciplinaApi = {
  async listarDisciplinas() {
    const response = await api.get("/disciplinas")
    return response.data
  },

  async buscarDisciplinaPorId(id: string) {
    const response = await api.get(`/disciplinas/${id}`)
    return response.data
  },

  async criarDisciplina(data: CriarDisciplinaRequest) {
    const response = await api.post("/disciplinas", data)
    return response.data
  },

  async atualizarDisciplina(id: string, data: CriarDisciplinaRequest) {
    const response = await api.put(`/disciplinas/${id}`, data)
    return response.data
  },

  async removerDisciplina(id: string) {
    const response = await api.delete(`/disciplinas/${id}`)
    return response.data
  },
}
