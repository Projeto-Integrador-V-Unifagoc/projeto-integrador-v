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

    const listarTurmasDisponiveis = async (cursoId: string, alunoId: string): Promise<TurmaDisponivel[]> => {
        setCarregando(true);
        try {
            return await matriculaApi.listarTurmasDisponiveis(cursoId, alunoId);
        } finally {
            setCarregando(false);
        }
    };

    const criarMatricula = async (alunoId: string, turmaDisciplinaId: string): Promise<MatriculaCriada> => {
        setCarregando(true);
        try {
            return await matriculaApi.criarMatricula(alunoId, turmaDisciplinaId);
        } finally {
            setCarregando(false);
        }
    };

    return { buscarAluno, listarTurmasDisponiveis, criarMatricula, carregando };
}
