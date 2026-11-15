import { api } from "../lib/axios";
import type { DashboardCoordenacao, DetalheCursoCoordenacao } from "../models/home-coordenacao-model";

export const homeCoordenacaoApi = {
  dashboard: async (periodoLetivoId?: string): Promise<DashboardCoordenacao> =>
    (await api.get("/coordenacao/dashboard", { params: periodoLetivoId ? { periodoLetivoId } : undefined })).data,
  detalheCurso: async (cursoId: string, periodoLetivoId: string): Promise<DetalheCursoCoordenacao> =>
    (await api.get(`/coordenacao/cursos/${cursoId}`, { params: { periodoLetivoId } })).data,
};

