import axios from 'axios';
import type { Avaliacao, CriarAvaliacaoDTO, AtualizarAvaliacaoDTO } from '../models/avaliacao-model';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
});

const STORAGE_KEY = 'clean-avaliacoes';

function isRecoverableError(error: unknown) {
  return axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
}

function getStorage() {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Avaliacao[];
  } catch {
    return [];
  }
}

function saveStorage(data: Avaliacao[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const avaliacaoApi = {
  async listar(): Promise<Avaliacao[]> {
    try {
      const response = await api.get<Avaliacao[]>('/avaliacoes');
      return response.data;
    } catch (error) {
      if (!isRecoverableError(error)) throw error;
      return getStorage();
    }
  },

  async buscarPorId(id: string): Promise<Avaliacao> {
    try {
      const response = await api.get<Avaliacao>(`/avaliacoes/${id}`);
      return response.data;
    } catch (error) {
      if (!isRecoverableError(error)) throw error;

      const avaliacao = getStorage().find((item) => item.id === id);
      if (!avaliacao) {
        throw new Error('Avaliacao nao encontrada.');
      }
      return avaliacao;
    }
  },

  async criar(data: CriarAvaliacaoDTO): Promise<Avaliacao> {
    try {
      const response = await api.post<Avaliacao>('/avaliacoes', data);
      return response.data;
    } catch (error) {
      if (!isRecoverableError(error)) throw error;

      const novaAvaliacao: Avaliacao = {
        id: crypto.randomUUID(),
        ...data,
        descricao_avaliacao: data.descricao_avaliacao || null,
        data_devolucao: data.data_devolucao || null,
        nota: data.nota || null,
        matricula_turma_disciplina_id: data.matricula_turma_disciplina_id || undefined,
      };

      const avaliacoes = getStorage();
      avaliacoes.push(novaAvaliacao);
      saveStorage(avaliacoes);
      return novaAvaliacao;
    }
  },

  async atualizar(id: string, data: AtualizarAvaliacaoDTO): Promise<Avaliacao> {
    try {
      const response = await api.put<Avaliacao>(`/avaliacoes/${id}`, data);
      return response.data;
    } catch (error) {
      if (!isRecoverableError(error)) throw error;

      const avaliacoes = getStorage();
      const index = avaliacoes.findIndex((item) => item.id === id);

      if (index === -1) {
        throw new Error('Avaliacao nao encontrada.');
      }

      const atualizada = { ...avaliacoes[index], ...data };
      avaliacoes[index] = atualizada;
      saveStorage(avaliacoes);
      return atualizada;
    }
  },

  async deletar(id: string): Promise<void> {
    try {
      await api.delete(`/avaliacoes/${id}`);
    } catch (error) {
      if (!isRecoverableError(error)) throw error;
      saveStorage(getStorage().filter((item) => item.id !== id));
    }
  },
};
