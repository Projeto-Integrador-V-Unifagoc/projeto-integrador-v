import { api } from "../lib/axios";
import type { RegistrarFrequenciaPayload, StatusFrequencia } from "../models/frequencia-model";

export const frequenciaApi = {
  async listarOpcoes() {
    const response = await api.get("/frequencias/opcoes");
    return response.data;
  },
  async obterChamada(params: { turmaDisciplinaId: string; data: string }) {
    const response = await api.get("/frequencias/chamada", { params });
    return response.data;
  },
  async registrarFrequencia(data: RegistrarFrequenciaPayload) {
    const response = await api.post("/frequencias", data);
    return response.data;
  },
  async editarFrequencia(id: string, status: StatusFrequencia) {
    const response = await api.put(`/frequencias/${id}`, { status });
    return response.data;
  },
  async removerFrequencia(id: string) {
    const response = await api.delete(`/frequencias/${id}`);
    return response.data;
  },
  async consultarAluno(alunoId: string) {
    const response = await api.get(`/frequencias/aluno/${alunoId}`);
    return response.data;
  },
  async registrarJustificativa(id: string, justificativa: string) {
    const response = await api.post(`/frequencias/${id}/justificativa`, { justificativa });
    return response.data;
  },
  async gerarRelatorio(params: { turmaDisciplinaId: string; dataInicio?: string; dataFim?: string }) {
    const response = await api.get("/frequencias/relatorio", { params });
    return response.data;
  },
};
