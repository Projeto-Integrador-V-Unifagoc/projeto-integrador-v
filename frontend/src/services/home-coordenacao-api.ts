import { api } from "../lib/axios";
import type { DashboardCoordenacao } from "../models/home-coordenacao-model";

export const homeCoordenacaoApi = {
  dashboard: async (periodoLetivoId?: string): Promise<DashboardCoordenacao> =>
    (await api.get("/coordenacao/dashboard", { params: periodoLetivoId ? { periodoLetivoId } : undefined })).data,
};

