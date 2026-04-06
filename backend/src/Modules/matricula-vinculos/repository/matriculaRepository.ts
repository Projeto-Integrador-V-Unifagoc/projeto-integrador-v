import { db } from '../../../database';

const SCHEMA = 'piv';

export interface NovaMatriculaDTO {
  alunoId: string;
}

export interface MatriculaVinculo {
  id: string;
  aluno_id: string;
  turma_id: string;
  professor_id: string | null;
  status: string | null;
  aprovacao: boolean | null;
  status_aprovado: string | null;
  data_aprovacao: Date | null;
  frequencia: number | null;
}

export class MatriculaRepository {

  async buscarCursoDoAluno(alunoId: string): Promise<string | null> {
    const aluno = await db(`${SCHEMA}.aluno`)
      .where({ id: alunoId })
      .select('curso_id')
      .first();
    return aluno?.curso_id ?? null;
  }

  async buscarPrimeiraVagaDisponivel(cursoId: string): Promise<string | null> {
    const turma = await db(`${SCHEMA}.turma as t`)
      .leftJoin(`${SCHEMA}.aluno_turma as at`, 't.id', 'at.turma_id')
      .where('t.curso_id', cursoId)
      .groupBy('t.id', 't.capacidade_alunos', 't.semestre')
      .havingRaw('COUNT(at.id) < t.capacidade_alunos')
      .orderBy('t.semestre', 'asc')
      .select('t.id')
      .first();
    return turma?.id ?? null;
  }

  async alunoJaPossuiMatricula(alunoId: string, turmaId: string): Promise<boolean> {
    const result = await db(`${SCHEMA}.aluno_turma`)
      .where({ aluno_id: alunoId, turma_id: turmaId })
      .count<{ count: string }>('id as count')
      .first();
    return Number(result?.count ?? 0) > 0;
  }

  async listarTodas(): Promise<MatriculaVinculo[]> {
    return db(`${SCHEMA}.aluno_turma`).select('*');
  }

  async listarPorAluno(alunoId: string): Promise<MatriculaVinculo[]> {
    return db(`${SCHEMA}.aluno_turma`)
      .where({ aluno_id: alunoId })
      .select('*');
  }

  async criar(alunoId: string, turmaId: string): Promise<MatriculaVinculo> {
    const [registro] = await db(`${SCHEMA}.aluno_turma`)
      .insert({
        aluno_id: alunoId,
        turma_id: turmaId,
        status: 'MATRICULADO',
      })
      .returning('*');
    return registro;
  }
}
