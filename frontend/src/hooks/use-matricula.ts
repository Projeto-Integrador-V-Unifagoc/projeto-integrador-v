import { useState } from "react";
import { matriculaApi } from "../services/matricula-api";
import type { AlunoParaMatricula, MatriculaCriada, TurmaDisponivel } from "../models/matricula-model";

export function useMatricula() {
    const [carregando, setCarregando] = useState(false);

    const buscarAluno = async (q: string): Promise<AlunoParaMatricula[]> => {
        setCarregando(true);
        try {
            return await matriculaApi.buscarAluno(q);
        } finally {
            setCarregando(false);
        }
    };

    const listarTurmasDisponiveis = async (cursoId: string): Promise<TurmaDisponivel[]> => {
        setCarregando(true);
        try {
            return await matriculaApi.listarTurmasDisponiveis(cursoId);
        } finally {
            setCarregando(false);
        }
    };

    const criarMatricula = async (alunoId: string, turmaId: string): Promise<MatriculaCriada> => {
        setCarregando(true);
        try {
            return await matriculaApi.criarMatricula(alunoId, turmaId);
        } finally {
            setCarregando(false);
        }
    };

    return { buscarAluno, listarTurmasDisponiveis, criarMatricula, carregando };
}
