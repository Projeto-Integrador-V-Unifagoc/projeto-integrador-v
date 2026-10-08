import { api } from "../lib/axios";
import type { FiltrosRelatorios, RelatorioItem } from "../models/relatorio-model";

export const relatorioApi = {
  async listarRelatorios(filtros: FiltrosRelatorios): Promise<RelatorioItem[]> {
    const response = await api.get<RelatorioItem[]>("/relatorios/academicos", { params: filtros });
    return response.data;
  },
};
