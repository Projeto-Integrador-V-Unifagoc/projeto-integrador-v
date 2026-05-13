import { api } from "../lib/axios";
import type { TurmaDisciplinaRequest, TurmaRequest } from "../models/turma-model";

export const turmaApi = {
  async listarTurmas() {
    const response = await api.get("/turmas");
    return response.data;
  },

  async buscarTurmaPorId(id: string) {
    const response = await api.get(`/turmas/${id}`);
    return response.data;
  },

  async criarTurma(data: TurmaRequest) {
    const response = await api.post("/turmas", data);
    return response.data;
  },

  async atualizarTurma(id: string, data: TurmaRequest) {
    const response = await api.put(`/turmas/${id}`, data);
    return response.data;
  },

  async removerTurma(id: string) {
    const response = await api.delete(`/turmas/${id}`);
    return response.data;
  },

  async listarDisciplinasDaTurma(id: string) {
    const response = await api.get(`/turmas/${id}/disciplinas`);
    return response.data;
  },

  async criarDisciplinaDaTurma(id: string, data: TurmaDisciplinaRequest) {
    const response = await api.post(`/turmas/${id}/disciplinas`, data);
    return response.data;
  },

  async atualizarDisciplinaDaTurma(id: string, turmaDisciplinaId: string, data: TurmaDisciplinaRequest) {
    const response = await api.put(`/turmas/${id}/disciplinas/${turmaDisciplinaId}`, data);
    return response.data;
  },

  async removerDisciplinaDaTurma(id: string, turmaDisciplinaId: string) {
    const response = await api.delete(`/turmas/${id}/disciplinas/${turmaDisciplinaId}`);
    return response.data;
  },
};
