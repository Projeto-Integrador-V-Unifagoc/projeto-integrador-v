import { db } from "../../../database/connection";

export interface TurmaDisponivel {
  id: string;
}
export interface MatriculaVinculo {
  id: string;
  aluno_id: string;
  turma_id: string;
  status: string;
}
export interface VinculoStatus {
  id: string;
  status: string;
  disciplina_nome: string;
}
export interface ConsultaStatusAluno {
  aluno_id: string;
  matricula: number;
  periodo: number | null;
  nome: string;
  cpf: string;
  curso_id: string;
  curso_nome: string;
  vinculos: VinculoStatus[];
}
export interface MatriculaDetalhada extends MatriculaVinculo {
  matricula_turma_disciplina_id: string;
  aluno_nome: string;
  aluno_matricula: number;
  disciplina_nome: string;
  curso_nome: string;
}

export class MatriculaRepository {
  // Minimal implementations to resolve rebase conflicts. Replace with full queries if needed.
  async listarTurmasDisponiveis(_cursoId: string): Promise<TurmaDisponivel[]> {
    return [];
  }
  async alunoJaMatriculado(
    _alunoId: string,
    _turmaId: string,
  ): Promise<boolean> {
    return false;
  }
  async criar(_alunoId: string, _turmaId: string): Promise<MatriculaVinculo> {
    throw new Error("Not implemented");
  }
  async listarTodas(): Promise<MatriculaDetalhada[]> {
    return [];
  }
  async listarPorAluno(_alunoId: string): Promise<MatriculaDetalhada[]> {
    return [];
  }
  async buscarPorId(_id: string): Promise<MatriculaVinculo | null> {
    return null;
  }
  async cancelar(_id: string): Promise<MatriculaVinculo | null> {
    return null;
  }
  async atualizarStatus(
    _id: string,
    _status: string,
  ): Promise<MatriculaVinculo | null> {
    return null;
  }
  async consultarStatusPorMatricula(
    _matricula: number,
  ): Promise<ConsultaStatusAluno | null> {
    return null;
  }
}
