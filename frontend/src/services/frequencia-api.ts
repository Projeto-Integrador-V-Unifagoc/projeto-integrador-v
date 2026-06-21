import { api } from "../lib/axios";
import type { RegistrarFrequenciaPayload } from "../models/frequencia-model";
export const frequenciaApi = {
  listarOpcoes: async () => (await api.get("/frequencias/opcoes")).data,
  obterChamada: async (params: { turmaDisciplinaId: string; data: string }) => (await api.get("/frequencias/chamada", { params })).data,
  salvarChamada: async (data: RegistrarFrequenciaPayload) => (await api.put("/frequencias/chamada", data)).data,
  consultarAluno: async (id: string) => (await api.get(`/frequencias/aluno/${id}`)).data,
  minhaFrequencia: async () => (await api.get("/frequencias/minha")).data,
  justificar: async (id: string, dados: { motivo: string; observacao?: string; confirmarSubstituicao?: boolean }) => (await api.post(`/frequencias/${id}/justificativa`, dados)).data,
  gerarRelatorio: async (params: { turmaDisciplinaId: string; dataInicio?: string; dataFim?: string }) => (await api.get("/frequencias/relatorio", { params })).data,
};
