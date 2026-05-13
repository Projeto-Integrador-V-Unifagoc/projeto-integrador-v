import { api } from "../lib/axios";
import type { AlunoParaMatricula, MatriculaCriada, MatriculaDetalhada, TurmaDisponivel } from "../models/matricula-model";

export const matriculaApi = {
    async buscarAluno(q: string): Promise<AlunoParaMatricula[]> {
        const response = await api.get("/alunos/buscar", { params: { q } });
        return response.data;
    },

    async listarTurmasDisponiveis(cursoId: string): Promise<TurmaDisponivel[]> {
        const response = await api.get(`/turmas/disponiveis/${cursoId}`);
        return response.data;
    },

    async criarMatricula(alunoId: string, turmaId: string): Promise<MatriculaCriada> {
        const response = await api.post("/matriculas", { alunoId, turmaId });
        return response.data;
    },

    async listarPorAluno(alunoId: string): Promise<MatriculaDetalhada[]> {
        const response = await api.get(`/matriculas/aluno/${alunoId}`);
        return response.data;
    },

    async listarTodas(): Promise<MatriculaDetalhada[]> {
        const response = await api.get("/matriculas");
        return response.data;
    },
};
