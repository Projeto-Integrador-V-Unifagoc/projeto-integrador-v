import { api } from "../lib/axios"

export interface StatusMatriculaCurso {
  id: string
  descricao: string
}

export interface StatusMatriculaDisciplina {
  id: string
  descricao: string
}

export const statusApi = {
  async listarStatusMatriculaCurso() {
    const response = await api.get<StatusMatriculaCurso[]>("/statusCurso")
    return response.data
  },

  async listarStatusMatriculaDisciplina() {
    const response = await api.get<StatusMatriculaDisciplina[]>("/statusDisciplina")
    return response.data
  },

  async buscarStatusMatriculaCursoPorId(id: string) {
    const response = await api.get<StatusMatriculaCurso>(`/statusCurso/${id}`)
    return response.data
  },

  async buscarStatusMatriculaDisciplinaPorId(id: string) {
    const response = await api.get<StatusMatriculaDisciplina>(`/statusDisciplina/${id}`)
    return response.data
  },

  async criarStatusMatriculaCurso(data: { descricao: string }) {
    const response = await api.post<StatusMatriculaCurso>("/statusCurso", data)
    return response.data
  },

  async criarStatusMatriculaDisciplina(data: { descricao: string }) {
    const response = await api.post<StatusMatriculaDisciplina>("/statusDisciplina", data)
    return response.data
  },
}
