import { api } from "../lib/axios";
import type { EventoAcademico, GeracaoAulasResumo, PeriodoLetivoRequest, TipoEventoAcademico } from "../models/periodo-letivo-model";

export const periodoLetivoApi = {
  async listarPeriodosLetivos() {
    const response = await api.get("/periodos-letivos");
    return response.data;
  },

  async buscarPeriodoLetivoPorId(id: string) {
    const response = await api.get(`/periodos-letivos/${id}`);
    return response.data;
  },

  async criarPeriodoLetivo(data: PeriodoLetivoRequest) {
    const response = await api.post("/periodos-letivos", data);
    return response.data;
  },

  async atualizarPeriodoLetivo(id: string, data: PeriodoLetivoRequest) {
    const response = await api.put(`/periodos-letivos/${id}`, data);
    return response.data;
  },

  async removerPeriodoLetivo(id: string) {
    const response = await api.delete(`/periodos-letivos/${id}`);
    return response.data;
  },

  async buscarCalendario(id: string): Promise<{ periodo: { id: string; codigo: string; dataInicio: string; dataFim: string; status: string }; eventos: EventoAcademico[] }> {
    return (await api.get(`/periodos-letivos/${id}/calendario`)).data;
  },

  async criarEvento(id: string, data: { tipo: TipoEventoAcademico; titulo: string; descricao?: string; dataInicio: string; dataFim: string; bloqueiaAulas: boolean }): Promise<EventoAcademico> {
    return (await api.post(`/periodos-letivos/${id}/calendario`, data)).data;
  },

  async atualizarEvento(id: string, data: { tipo: TipoEventoAcademico; titulo: string; descricao?: string; dataInicio: string; dataFim: string; bloqueiaAulas: boolean }): Promise<EventoAcademico> {
    return (await api.put(`/calendario-academico/eventos/${id}`, data)).data;
  },

  async removerEvento(id: string) { await api.delete(`/calendario-academico/eventos/${id}`); },

  async gerarAulas(id: string, data: { dataInicio: string; dataFim: string; simular: boolean }): Promise<GeracaoAulasResumo> {
    return (await api.post(`/periodos-letivos/${id}/aulas/gerar`, data)).data;
  },
};
