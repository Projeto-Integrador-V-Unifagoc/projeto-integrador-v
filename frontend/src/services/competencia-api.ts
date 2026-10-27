import { api } from "../lib/axios";
import type { CompetenciaResponse, TipoCompetencia } from "../models/disciplina-model";

export interface CriarCompetenciaRequest {
  codigo: string;
  nome: string;
  descricao: string;
  tipo: TipoCompetencia;
}

export const competenciaApi = {
  listar: async (): Promise<CompetenciaResponse[]> =>
    (await api.get("/competencias", { params: { ativo: true } })).data,
  criar: async (data: CriarCompetenciaRequest): Promise<CompetenciaResponse> =>
    (await api.post("/competencias", data)).data,
};
