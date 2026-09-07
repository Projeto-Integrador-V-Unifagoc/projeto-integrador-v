import { apiAutenticada as api } from "./api-autenticada";
import type {
    AlunoParaMatricula,
    DisciplinaDaTurma,
    MatriculaCriada,
    MatriculaDetalhada,
    TurmaDisponivel,
    VinculoAcademico,
} from "../models/matricula-model";

export const matriculaApi = {
    async buscarAluno(q: string): Promise<AlunoParaMatricula[]> {
        const response = await api.get("/alunos/buscar", { params: { q } });
        return response.data;
    },

    /** Turmas do curso com vaga disponível. */
    async listarTurmasDisponiveis(cursoId: string): Promise<TurmaDisponivel[]> {
        const response = await api.get(`/turmas/disponiveis/${cursoId}`);
        return response.data;
    },

    /** Disciplinas ofertadas na turma — os vínculos que serão criados. */
    async listarDisciplinasDaTurma(turmaId: string): Promise<DisciplinaDaTurma[]> {
        const response = await api.get(`/matriculas/turmas/${turmaId}/disciplinas`);
        return response.data;
    },

    /**
     * Cria a matrícula. Sem `turmaDisciplinaIds` o backend vincula todas as
     * disciplinas ofertadas na turma.
     */
    async criarMatricula(
        alunoId: string,
        turmaId: string,
        turmaDisciplinaIds?: string[]
    ): Promise<MatriculaCriada> {
        const response = await api.post("/matriculas", { alunoId, turmaId, turmaDisciplinaIds });
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

    async listarVinculos(matriculaId: string): Promise<VinculoAcademico[]> {
        const response = await api.get(`/matriculas/${matriculaId}/disciplinas`);
        return response.data;
    },

    async cancelarMatricula(matriculaId: string): Promise<MatriculaDetalhada> {
        const response = await api.patch(`/matriculas/${matriculaId}/cancelar`);
        return response.data;
    },

    async aprovarMatricula(matriculaId: string): Promise<MatriculaDetalhada> {
        const response = await api.patch(`/matriculas/${matriculaId}/aprovar`);
        return response.data;
    },
};
