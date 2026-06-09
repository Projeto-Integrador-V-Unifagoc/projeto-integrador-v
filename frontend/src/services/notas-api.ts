import { api } from "../lib/axios";

export interface NotaMockApi {
  id: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  professorId: string;
  professorNome: string;
  periodoLetivo: string;
  avaliacoes: Array<{
    id: string;
    nome: string;
    nota: number;
    peso: number;
  }>;
  media: number;
  situacao: string;
}

export const notasApi = {
  async buscarPorAluno(alunoId: string): Promise<NotaMockApi[]> {
    const response = await api.get<NotaMockApi[]>(`/notas/mock/aluno/${alunoId}`);
    return response.data;
  },
};
