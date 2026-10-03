import { api } from "../lib/axios";
import type {
  BoletimAluno,
  ItemLoteNota,
  Lancamento,
  OpcoesNota,
  Recuperacao,
  Rendimento,
  ResumoNotas,
} from "../models/nota-model";

export const notaApi = {
  listarOpcoes: async (): Promise<OpcoesNota> => (await api.get<OpcoesNota>("/notas/opcoes")).data,
  obterLancamento: async (avaliacaoId: string): Promise<Lancamento> =>
    (await api.get<Lancamento>(`/notas/avaliacoes/${encodeURIComponent(avaliacaoId)}/lancamento`)).data,
  salvarLote: async (avaliacaoId: string, itens: ItemLoteNota[], motivo?: string): Promise<Lancamento> =>
    (await api.put<Lancamento>(`/notas/avaliacoes/${encodeURIComponent(avaliacaoId)}/lote`, { itens, motivo })).data,
  obterRendimento: async (turmaDisciplinaId: string): Promise<Rendimento> =>
    (await api.get<Rendimento>(`/notas/turmas/${encodeURIComponent(turmaDisciplinaId)}/rendimento`)).data,
  obterRecuperacao: async (turmaDisciplinaId: string): Promise<Recuperacao> =>
    (await api.get<Recuperacao>(`/notas/turmas/${encodeURIComponent(turmaDisciplinaId)}/recuperacao`)).data,
  criarAutorizacao: async (dados: { avaliacaoId: string; matriculaTurmaDisciplinaId?: string; motivo: string; prazoEmDias?: number }) =>
    (await api.post("/notas/autorizacoes-excepcionais", dados)).data,
  meuBoletim: async (periodoId?: string): Promise<BoletimAluno> =>
    (await api.get<BoletimAluno>("/notas/me", { params: periodoId ? { periodoId } : {} })).data,
  meuResumo: async (): Promise<ResumoNotas> => (await api.get<ResumoNotas>("/notas/me/resumo")).data,
  consultarAluno: async (alunoId: string): Promise<BoletimAluno> => (await api.get<BoletimAluno>(`/notas/alunos/${encodeURIComponent(alunoId)}`)).data,
};
