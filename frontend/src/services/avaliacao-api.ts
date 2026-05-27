import { api } from "../lib/axios";
import type {
  AtualizarAvaliacaoDTO,
  Avaliacao,
  CriarAvaliacaoDTO,
} from "../models/avaliacao-model";

export const avaliacaoApi = {
  async listar(): Promise<Avaliacao[]> {
    const response = await api.get<Avaliacao[]>("/avaliacoes");
    return response.data;
  },

  async buscarPorId(id: string): Promise<Avaliacao> {
    const response = await api.get<Avaliacao>(`/avaliacoes/${id}`);
    return response.data;
  },

  async criar(data: CriarAvaliacaoDTO): Promise<Avaliacao> {
    const response = await api.post<Avaliacao>("/avaliacoes", data);
    return response.data;
  },

  async atualizar(id: string, data: AtualizarAvaliacaoDTO): Promise<Avaliacao> {
    const response = await api.put<Avaliacao>(`/avaliacoes/${id}`, data);
    return response.data;
  },

  async deletar(id: string): Promise<void> {
    await api.delete(`/avaliacoes/${id}`);
  },
};
