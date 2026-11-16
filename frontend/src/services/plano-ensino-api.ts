import { api } from "../lib/axios";
import type { ConteudoPlanoEnsino, PlanoEnsinoResponse } from "../models/plano-ensino-model";
export const planoEnsinoApi = {
  listar: async (ofertaId: string): Promise<PlanoEnsinoResponse[]> => (await api.get(`/turmas-disciplinas/${ofertaId}/planos-ensino`)).data,
  criar: async (ofertaId: string): Promise<PlanoEnsinoResponse> => (await api.post(`/turmas-disciplinas/${ofertaId}/planos-ensino`)).data,
  atualizar: async (id: string, conteudo: ConteudoPlanoEnsino): Promise<PlanoEnsinoResponse> => (await api.put(`/planos-ensino/${id}`, conteudo)).data,
  submeter: async (id: string): Promise<PlanoEnsinoResponse> => (await api.post(`/planos-ensino/${id}/submeter`)).data,
  aprovar: async (id: string): Promise<PlanoEnsinoResponse> => (await api.post(`/planos-ensino/${id}/aprovar`)).data,
  arquivar: async (id: string): Promise<PlanoEnsinoResponse> => (await api.post(`/planos-ensino/${id}/arquivar`)).data,
};

