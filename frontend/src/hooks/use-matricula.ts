import { useState } from "react";
import { matriculaApi } from "../services/matricula-api";
import type {
    AlunoParaMatricula,
    DisciplinaDaTurma,
    MatriculaCriada,
    MatriculaDetalhada,
    TurmaDisponivel,
    VinculoAcademico,
} from "../models/matricula-model";

export function useMatricula() {
    const [carregando, setCarregando] = useState(false);

    async function comCarregamento<T>(acao: () => Promise<T>): Promise<T> {
        setCarregando(true);
        try {
            return await acao();
        } finally {
            setCarregando(false);
        }
    }

    const buscarAluno = (q: string): Promise<AlunoParaMatricula[]> =>
        comCarregamento(() => matriculaApi.buscarAluno(q));

    const listarTurmasDisponiveis = (cursoId: string): Promise<TurmaDisponivel[]> =>
        comCarregamento(() => matriculaApi.listarTurmasDisponiveis(cursoId));

    const listarDisciplinasDaTurma = (turmaId: string): Promise<DisciplinaDaTurma[]> =>
        comCarregamento(() => matriculaApi.listarDisciplinasDaTurma(turmaId));

    const criarMatricula = (
        alunoId: string,
        turmaId: string,
        turmaDisciplinaIds?: string[]
    ): Promise<MatriculaCriada> =>
        comCarregamento(() => matriculaApi.criarMatricula(alunoId, turmaId, turmaDisciplinaIds));

    const listarTodas = (): Promise<MatriculaDetalhada[]> =>
        comCarregamento(() => matriculaApi.listarTodas());

    const listarVinculos = (matriculaId: string): Promise<VinculoAcademico[]> =>
        comCarregamento(() => matriculaApi.listarVinculos(matriculaId));

    const aprovarMatricula = (matriculaId: string): Promise<MatriculaDetalhada> =>
        comCarregamento(() => matriculaApi.aprovarMatricula(matriculaId));

    const cancelarMatricula = (matriculaId: string): Promise<MatriculaDetalhada> =>
        comCarregamento(() => matriculaApi.cancelarMatricula(matriculaId));

    return {
        buscarAluno,
        listarTurmasDisponiveis,
        listarDisciplinasDaTurma,
        criarMatricula,
        listarTodas,
        listarVinculos,
        aprovarMatricula,
        cancelarMatricula,
        carregando,
    };
}
