import { api } from "../lib/axios";
import type { CompetenciaResponse, TipoCompetencia } from "../models/disciplina-model";

export interface CriarCompetenciaRequest {
  codigo: string;
  nome: string;
  descricao: string;
  tipo: TipoCompetencia;
}

export interface FiltrosCompetencia {
  q?: string;
  tipo?: TipoCompetencia;
  ativo?: boolean;
}

export const competenciaApi = {
  listar: async (filtros: FiltrosCompetencia = { ativo: true }): Promise<CompetenciaResponse[]> =>
    (await api.get("/competencias", { params: filtros })).data,
  buscar: async (id: string): Promise<CompetenciaResponse> =>
    (await api.get(`/competencias/${id}`)).data,
  criar: async (data: CriarCompetenciaRequest): Promise<CompetenciaResponse> =>
    (await api.post("/competencias", data)).data,
  atualizar: async (id: string, data: CriarCompetenciaRequest): Promise<CompetenciaResponse> =>
    (await api.put(`/competencias/${id}`, data)).data,
  alterarStatus: async (id: string, ativo: boolean): Promise<CompetenciaResponse> =>
    (await api.patch(`/competencias/${id}/status`, { ativo })).data,
  remover: async (id: string): Promise<void> => {
    await api.delete(`/competencias/${id}`);
  },
};
