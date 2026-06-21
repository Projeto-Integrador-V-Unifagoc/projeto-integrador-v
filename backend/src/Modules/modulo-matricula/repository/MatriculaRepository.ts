import { db } from "../../../database/connection";

export interface TurmaDisponivel {
  id: string;
  semestre?: string;
  capacidade_alunos?: number;
  vagas_disponiveis?: number;
  disciplina_id?: string;
  disciplina_nome?: string;
  disciplina_codigo?: string;
  carga_horaria?: number;
  professor_nome?: string;
  curso_id?: string;
  curso_nome?: string;
}
export interface MatriculaVinculo {
  id: string;
  aluno_id: string;
  turma_id: string;
  status: string | null;
  aprovacao?: boolean | null;
}
export interface VinculoStatus {
  id: string;
  status: string | null;
  aprovacao: boolean | null;
  disciplina_nome: string;
  semestre?: string;
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
  matricula_turma_disciplina_id?: string | null;
  aluno_nome: string;
  aluno_matricula: number;
  disciplina_nome: string;
  semestre?: string;
  curso_nome: string;
  professor_nome?: string | null;
}

export class MatriculaRepository {
  async listarTurmasDisponiveis(cursoId: string): Promise<TurmaDisponivel[]> {
    const rows = await db("turma_disciplina as td")
      .join("turma as t", "td.turma_id", "t.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .join("professor as p", "td.professor_id", "p.id")
      .join("pessoa as pes", "p.pessoa_id", "pes.id")
      .join("curso as c", "t.curso_id", "c.id")
      .leftJoin("matricula as m", "m.turma_id", "t.id")
      .where("t.curso_id", cursoId)
      .groupBy("t.id", "td.id", "d.id", "pes.id", "c.id", "t.capacidade_alunos")
      .havingRaw("t.capacidade_alunos > COUNT(DISTINCT m.id)")
      .select(
        "t.id",
        "t.sigla as semestre",
        "t.capacidade_alunos",
        "d.id as disciplina_id",
        "d.nome as disciplina_nome",
        "d.codigo as disciplina_codigo",
        "d.carga_horaria",
        "pes.nome as professor_nome",
        "c.id as curso_id",
        "c.nome as curso_nome",
        db.raw(
          "(t.capacidade_alunos - COUNT(DISTINCT m.id)) as vagas_disponiveis",
        ),
      );
    return rows;
  }

  async alunoJaMatriculado(alunoId: string, turmaId: string): Promise<boolean> {
    const result = await db("matricula")
      .where({ aluno_id: alunoId, turma_id: turmaId })
      .count("id as count")
      .first();
    return Number(result?.count ?? 0) > 0;
  }

  async criar(alunoId: string, turmaId: string): Promise<MatriculaVinculo> {
    const turma = await db("turma").where({ id: turmaId }).first();
    if (!turma) throw new Error(`Turma ${turmaId} não encontrada.`);

    return db.transaction(async (trx) => {
      const [matricula] = await trx("matricula")
        .insert({
          aluno_id: alunoId,
          turma_id: turmaId,
          curso_id: turma.curso_id,
          status: "MATRICULADO",
        })
        .returning("*");

      const turmaDisciplinas = await trx("turma_disciplina")
        .where({ turma_id: turmaId })
        .select("id");

      if (turmaDisciplinas.length) {
        await trx("matricula_turma_disciplina")
          .insert(
            turmaDisciplinas.map((turmaDisciplina) => ({
              matricula_id: matricula.id,
              turma_disciplina_id: turmaDisciplina.id,
              status: "MATRICULADO",
            })),
          )
          .onConflict(["matricula_id", "turma_disciplina_id"])
          .ignore();
      }

      return matricula;
    });
  }

  async listarTodas(): Promise<MatriculaDetalhada[]> {
    return this.queryMatriculasDetalhadas().orderBy("m.created_at", "desc");
  }

  private queryMatriculasDetalhadas() {
    return db("matricula as m")
      .join("aluno as a", "m.aluno_id", "a.id")
      .join("pessoa as p", "a.pessoa_id", "p.id")
      .join("turma as t", "m.turma_id", "t.id")
      .join("curso as c", "t.curso_id", "c.id")
      .leftJoin("matricula_turma_disciplina as mtd", "mtd.matricula_id", "m.id")
      .leftJoin("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .leftJoin("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .leftJoin("disciplinas as d", "cd.disciplina_id", "d.id")
      .leftJoin("professor as pr", "td.professor_id", "pr.id")
      .leftJoin("pessoa as pp", "pr.pessoa_id", "pp.id")
      .select(
        "m.id",
        "m.aluno_id",
        "m.turma_id",
        "m.status",
        "mtd.id as matricula_turma_disciplina_id",
        "p.nome as aluno_nome",
        "a.matricula as aluno_matricula",
        "d.nome as disciplina_nome",
        "t.sigla as semestre",
        "c.nome as curso_nome",
        "pp.nome as professor_nome",
      );
  }

  async listarPorAluno(alunoId: string): Promise<MatriculaDetalhada[]> {
    return this.queryMatriculasDetalhadas()
      .where("m.aluno_id", alunoId)
      .orderBy("t.sigla", "asc")
      .orderBy("d.nome", "asc");
  }

  async buscarPorId(id: string): Promise<MatriculaVinculo | null> {
    const mat = await db("matricula").where({ id }).first();
    return mat ?? null;
  }

  async cancelar(id: string): Promise<MatriculaVinculo | null> {
    const [mat] = await db("matricula")
      .where({ id })
      .update({ status: "CANCELADO" })
      .returning("*");
    await db("matricula_turma_disciplina")
      .where({ matricula_id: id })
      .update({ status: "CANCELADO" });
    return mat ?? null;
  }

  async atualizarStatus(
    id: string,
    status: string,
  ): Promise<MatriculaVinculo | null> {
    const [mat] = await db("matricula")
      .where({ id })
      .update({ status })
      .returning("*");
    await db("matricula_turma_disciplina")
      .where({ matricula_id: id })
      .update({ status });
    return mat ?? null;
  }

  async consultarStatusPorMatricula(
    matricula: number,
  ): Promise<ConsultaStatusAluno | null> {
    const aluno = await db("aluno as a")
      .join("pessoa as p", "a.pessoa_id", "p.id")
      .join("curso as c", "a.curso_id", "c.id")
      .where("a.matricula", matricula)
      .select(
        "a.id as aluno_id",
        "a.matricula",
        "a.periodo",
        "p.nome",
        "p.cpf",
        "c.id as curso_id",
        "c.nome as curso_nome",
      )
      .first();

    if (!aluno) return null;

    const vinculos = await db("matricula as m")
      .join("matricula_turma_disciplina as mtd", "mtd.matricula_id", "m.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .where("m.aluno_id", aluno.aluno_id)
      .select(
        "mtd.id",
        "mtd.status",
        "d.nome as disciplina_nome",
        "t.sigla as semestre",
      )
      .orderBy("t.sigla", "desc");

    return { ...aluno, vinculos };
  }
}
