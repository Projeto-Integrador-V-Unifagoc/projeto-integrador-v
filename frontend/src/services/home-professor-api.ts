import { api } from "../lib/axios";
import type { DashboardProfessor, DetalheAlunoAtencaoProfessor, DetalheAtribuicaoProfessor } from "../models/home-professor-model";

export const homeProfessorApi = {
  dashboard: async (periodoLetivoId?: string): Promise<DashboardProfessor> =>
    (await api.get("/me/professor/dashboard", { params: periodoLetivoId ? { periodoLetivoId } : undefined })).data,
  detalhe: async (turmaDisciplinaId: string): Promise<DetalheAtribuicaoProfessor> =>
    (await api.get(`/me/professor/turmas/${turmaDisciplinaId}`)).data,
  detalheAluno: async (turmaDisciplinaId: string, alunoId: string): Promise<DetalheAlunoAtencaoProfessor> =>
    (await api.get(`/me/professor/turmas/${turmaDisciplinaId}/alunos/${alunoId}`)).data,
};
