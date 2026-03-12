import axios from "axios";

import type { Avaliacao, AvaliacaoPayload } from "../models/avaliacao-model";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
});

export const avaliacaoApi = {
  async listar() {
    const response = await api.get<Avaliacao[]>("/avaliacoes");
    return response.data;
  },

  async criar(data: AvaliacaoPayload) {
    const response = await api.post<Avaliacao>("/avaliacoes", data);
    return response.data;
  },

  async atualizar(id: number, data: Partial<AvaliacaoPayload>) {
    const response = await api.put<Avaliacao>(`/avaliacoes/${id}`, data);
    return response.data;
  },

  async deletar(id: number) {
    await api.delete(`/avaliacoes/${id}`);
  },
};
