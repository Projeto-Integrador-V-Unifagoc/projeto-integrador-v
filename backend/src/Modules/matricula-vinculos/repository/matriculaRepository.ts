import { db } from '../../../database';

const SCHEMA = 'piv';
export interface NovaMatriculaDTO {
  alunoId: string;
  turmaId?: string; // opcional: se não informado, usa a primeira vaga disponível
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
export interface MatriculaDetalhada {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_matricula: string;
  aluno_cpf: string;
  aluno_email: string;
  aluno_periodo: string;
  turma_id: string;
  semestre: string;
  capacidade_alunos: number;
  disciplina_id: string;
  disciplina_nome: string;
  disciplina_codigo: string;
  carga_horaria: number;
  pre_requisito: string | null;
  professor_id: string | null;
  professor_nome: string | null;
  curso_id: string;
  curso_nome: string;
  status: string | null;
  aprovacao: boolean | null;
  status_aprovado: string | null;
  data_aprovacao: Date | null;
  frequencia: number | null;
}
export interface AlunoInfo {
  id: string;
  matricula: string;
  periodo: string;
  curso_id: string;
  curso_nome: string;
  nome: string;
  cpf: string;
  email: string;
  data_nascimento: Date;
}

export interface TurmaDisponivel {
  id: string;
  semestre: string;
  capacidade_alunos: number;
  vagas_disponiveis: number;
  disciplina_id: string;
  disciplina_nome: string;
  disciplina_codigo: string;
  carga_horaria: number;
  pre_requisito: string | null;
  professor_id: string;
  professor_nome: string;
  curso_id: string;
  curso_nome: string;
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

  async buscarAlunoPorCpfOuMatricula(query: string): Promise<AlunoInfo[]> {
    return db(`${SCHEMA}.aluno as a`)
      .join(`${SCHEMA}.pessoa as p`, 'a.pessoa_id', 'p.id')
      .join(`${SCHEMA}.usuario as u`, 'a.usuario_id', 'u.id')
      .join(`${SCHEMA}.curso as c`, 'a.curso_id', 'c.id')
      .where('p.cpf', query)
      .orWhere('a.matricula', query)
      .select(
        'a.id',
        'a.matricula',
        'a.periodo as aluno_periodo',
        'a.curso_id',
        'c.nome as curso_nome',
        'p.nome',
        'p.cpf',
        'p.data_nascimento',
        'u.email',
      )
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          matricula: r.matricula,
          periodo: r.aluno_periodo,
          curso_id: r.curso_id,
          curso_nome: r.curso_nome,
          nome: r.nome,
          cpf: r.cpf,
          email: r.email,
          data_nascimento: r.data_nascimento,
        })),
      );
  }

  async buscarAlunoPorId(alunoId: string): Promise<AlunoInfo | null> {
    const row = await db(`${SCHEMA}.aluno as a`)
      .join(`${SCHEMA}.pessoa as p`, 'a.pessoa_id', 'p.id')
      .join(`${SCHEMA}.usuario as u`, 'a.usuario_id', 'u.id')
      .join(`${SCHEMA}.curso as c`, 'a.curso_id', 'c.id')
      .where('a.id', alunoId)
      .select(
        'a.id',
        'a.matricula',
        'a.periodo as aluno_periodo',
        'a.curso_id',
        'c.nome as curso_nome',
        'p.nome',
        'p.cpf',
        'p.data_nascimento',
        'u.email',
      )
      .first();

    if (!row) return null;
    return {
      id: row.id,
      matricula: row.matricula,
      periodo: row.aluno_periodo,
      curso_id: row.curso_id,
      curso_nome: row.curso_nome,
      nome: row.nome,
      cpf: row.cpf,
      email: row.email,
      data_nascimento: row.data_nascimento,
    };
  }

  async listarTurmasDisponiveisPorCurso(cursoId: string): Promise<TurmaDisponivel[]> {
    const rows = await db(`${SCHEMA}.turma as t`)
      .join(`${SCHEMA}.disciplinas as d`, 't.disciplina_id', 'd.id')
      .join(`${SCHEMA}.curso as c`, 't.curso_id', 'c.id')
      .join(`${SCHEMA}.professor as prof`, 't.professor_id', 'prof.id')
      .join(`${SCHEMA}.pessoa as pp`, 'prof.pessoa_id', 'pp.id')
      .leftJoin(`${SCHEMA}.aluno_turma as at`, 't.id', 'at.turma_id')
      .where('t.curso_id', cursoId)
      .groupBy(
        't.id', 't.semestre', 't.capacidade_alunos',
        'd.id', 'd.nome', 'd.codigo', 'd.carga_horaria', 'd.pre_requisito',
        'prof.id', 'pp.nome',
        'c.id', 'c.nome',
      )
      .havingRaw('COUNT(at.id) < t.capacidade_alunos')
      .select(
        't.id',
        't.semestre',
        't.capacidade_alunos',
        db.raw('(t.capacidade_alunos - COUNT(at.id))::int as vagas_disponiveis'),
        'd.id as disciplina_id',
        'd.nome as disciplina_nome',
        'd.codigo as disciplina_codigo',
        'd.carga_horaria',
        'd.pre_requisito',
        'prof.id as professor_id',
        'pp.nome as professor_nome',
        'c.id as curso_id',
        'c.nome as curso_nome',
      )
      .orderBy('t.semestre', 'asc');

    return rows as TurmaDisponivel[];
  }

  private selectMatriculaDetalhada() {
    return db(`${SCHEMA}.aluno_turma as mat`)
      .join(`${SCHEMA}.aluno as a`, 'mat.aluno_id', 'a.id')
      .join(`${SCHEMA}.pessoa as p`, 'a.pessoa_id', 'p.id')
      .join(`${SCHEMA}.usuario as u`, 'a.usuario_id', 'u.id')
      .join(`${SCHEMA}.turma as t`, 'mat.turma_id', 't.id')
      .join(`${SCHEMA}.disciplinas as d`, 't.disciplina_id', 'd.id')
      .join(`${SCHEMA}.curso as c`, 't.curso_id', 'c.id')
      .leftJoin(`${SCHEMA}.professor as prof`, 't.professor_id', 'prof.id')
      .leftJoin(`${SCHEMA}.pessoa as pp`, 'prof.pessoa_id', 'pp.id')
      .select(
        'mat.id',
        'a.id as aluno_id',
        'p.nome as aluno_nome',
        'a.matricula as aluno_matricula',
        'p.cpf as aluno_cpf',
        'u.email as aluno_email',
        'a.periodo as aluno_periodo',
        't.id as turma_id',
        't.semestre',
        't.capacidade_alunos',
        'd.id as disciplina_id',
        'd.nome as disciplina_nome',
        'd.codigo as disciplina_codigo',
        'd.carga_horaria',
        'd.pre_requisito',
        'prof.id as professor_id',
        'pp.nome as professor_nome',
        'c.id as curso_id',
        'c.nome as curso_nome',
        'mat.status',
        'mat.aprovacao',
        'mat.status_aprovado',
        'mat.data_aprovacao',
        'mat.frequencia',
      );
  }

  async listarTodas(): Promise<MatriculaVinculo[]> {
    return db(`${SCHEMA}.aluno_turma`).select('*');
  }

  async listarTodasComDetalhes(): Promise<MatriculaDetalhada[]> {
    return this.selectMatriculaDetalhada().orderBy('p.nome', 'asc') as Promise<MatriculaDetalhada[]>;
  }

  async listarPorAluno(alunoId: string): Promise<MatriculaVinculo[]> {
    return db(`${SCHEMA}.aluno_turma`)
      .where({ aluno_id: alunoId })
      .select('*');
  }

  async listarPorAlunoComDetalhes(alunoId: string): Promise<MatriculaDetalhada[]> {
    return this.selectMatriculaDetalhada()
      .where('a.id', alunoId)
      .orderBy('t.semestre', 'asc') as Promise<MatriculaDetalhada[]>;
  }

  async buscarPorId(id: string): Promise<MatriculaDetalhada | null> {
    const row = await this.selectMatriculaDetalhada().where('mat.id', id).first();
    return (row as MatriculaDetalhada) ?? null;
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

  async cancelarMatricula(id: string): Promise<MatriculaVinculo | null> {
    const [registro] = await db(`${SCHEMA}.aluno_turma`)
      .where({ id })
      .update({ status: 'CANCELADO' })
      .returning('*');
    return registro ?? null;
  }

  async atualizarStatus(id: string, status: string): Promise<MatriculaVinculo | null> {
    const [registro] = await db(`${SCHEMA}.aluno_turma`)
      .where({ id })
      .update({ status })
      .returning('*');
    return registro ?? null;
  }
}
