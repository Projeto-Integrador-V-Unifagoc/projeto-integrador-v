import { api } from "../lib/axios";
import type { PeriodoLetivoRequest } from "../models/periodo-letivo-model";

export const periodoLetivoApi = {
  async listarPeriodosLetivos() {
    const response = await api.get("/periodos-letivos");
    return response.data;
  },

  async buscarPeriodoLetivoPorId(id: string) {
    const response = await api.get(`/periodos-letivos/${id}`);
    return response.data;
  },

  async criarPeriodoLetivo(data: PeriodoLetivoRequest) {
    const response = await api.post("/periodos-letivos", data);
    return response.data;
  },

  async atualizarPeriodoLetivo(id: string, data: PeriodoLetivoRequest) {
    const response = await api.put(`/periodos-letivos/${id}`, data);
    return response.data;
  },

  async removerPeriodoLetivo(id: string) {
    const response = await api.delete(`/periodos-letivos/${id}`);
    return response.data;
  },
};
