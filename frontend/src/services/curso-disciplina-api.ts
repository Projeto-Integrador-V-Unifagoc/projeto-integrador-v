import { api } from "../lib/axios";
import type { AtualizarCursoDisciplinaRequest, CriarMatrizCurricularRequest, CursoDisciplinaRequest } from "../models/curso-disciplina-model";

export const cursoDisciplinaApi = {
  async listarCursoDisciplinas() {
    const response = await api.get("/curso-disciplina");
    return response.data;
  },

  async listarMatrizCurricularPorCursoId(cursoId: string, matrizId?: string) {
    const response = await api.get(`/cursos/${cursoId}/matriz-curricular`, { params: matrizId ? { matrizId } : undefined });
    return response.data;
  },

  async criarCursoDisciplina(data: CursoDisciplinaRequest) {
    const response = await api.post("/curso-disciplina", data);
    return response.data;
  },

  async atualizarCursoDisciplina(id: string, data: AtualizarCursoDisciplinaRequest) {
    const response = await api.put(`/curso-disciplina/${id}`, data);
    return response.data;
  },

  async removerCursoDisciplina(id: string) {
    const response = await api.delete(`/curso-disciplina/${id}`);
    return response.data;
  },

  async listarMatrizes(cursoId: string) {
    const response = await api.get(`/cursos/${cursoId}/matrizes`);
    return response.data;
  },

  async criarMatriz(cursoId: string, data: CriarMatrizCurricularRequest) {
    const response = await api.post(`/cursos/${cursoId}/matrizes`, data);
    return response.data;
  },

  async publicarMatriz(id: string, encerrarVigente: boolean) {
    const response = await api.post(`/matrizes-curriculares/${id}/publicar`, { encerrarVigente });
    return response.data;
  },
};
