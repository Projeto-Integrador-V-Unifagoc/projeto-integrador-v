import { db } from "../../../database/connection";
import { FiltrosRelatorioAcademico } from "../models/RelatorioAcademico";

export class RelatorioRepository {
  async buscarAlunoPorUsuarioId(usuarioId: string) {
    return db("aluno").where({ usuario_id: usuarioId }).select("id").first();
  }

  async buscarProfessorPorUsuarioId(usuarioId: string) {
    return db("professor").where({ usuario_id: usuarioId }).select("id").first();
  }

  async listarTurmasDisciplinaDoProfessor(professorId: string) {
    return db("turma_disciplina")
      .where({ professor_id: professorId })
      .select("id");
  }

  async listarLinhasAcademicas(filtros: FiltrosRelatorioAcademico) {
    const query = db("aluno as a")
      .join("pessoa as p", "p.id", "a.pessoa_id")
      .leftJoin("curso as c", "c.id", "a.curso_id")
      .leftJoin("aluno_turma as at", "at.aluno_id", "a.id")
      .leftJoin("turma as t", "t.id", "at.turma_id")
      .leftJoin("disciplinas as d", "d.id", "t.disciplina_id")
      .leftJoin("avaliacao as av", "av.aluno_turma_id", "at.id")
      .select(
        "a.id as alunoId",
        "a.matricula",
        "p.nome as aluno",
        "a.curso_id as cursoId",
        db.raw("COALESCE(c.nome, 'Curso nao informado') as curso"),
        "a.periodo",
        "t.id as turmaId",
        "d.id as disciplinaId",
        db.raw("COALESCE(d.nome, 'Sem disciplina vinculada') as disciplina"),
        db.raw("COALESCE(d.carga_horaria, 0) as \"cargaHoraria\""),
        db.raw("COALESCE(t.semestre, a.periodo, 'Periodo nao informado') as ano"),
        db.raw("ROUND(AVG(av.nota)::numeric, 2) as nota"),
        "at.frequencia",
        "at.status_aprovado as situacao"
      )
      .groupBy(
        "a.id",
        "a.matricula",
        "p.nome",
        "a.curso_id",
        "c.nome",
        "a.periodo",
        "t.id",
        "d.id",
        "d.nome",
        "d.carga_horaria",
        "t.semestre",
        "at.frequencia",
        "at.status_aprovado"
      )
      .orderBy("p.nome")
      .orderBy("t.semestre")
      .orderBy("d.nome");

    if (filtros.alunoId) {
      query.where("a.id", filtros.alunoId);
    }

    if (filtros.matricula) {
      query.where("a.matricula", filtros.matricula);
    }

    if (filtros.cursoId) {
      query.where("a.curso_id", filtros.cursoId);
    }

    if (filtros.turmaId) {
      query.where("t.id", filtros.turmaId);
    }

    if (filtros.turmaIdsPermitidos?.length) {
      query.whereIn("t.id", filtros.turmaIdsPermitidos);
    }

    if (filtros.disciplinaId) {
      query.where("d.id", filtros.disciplinaId);
    }

    if (filtros.busca) {
      const termo = `%${filtros.busca}%`;
      query.where((builder) => {
        builder
          .whereILike("p.nome", termo)
          .orWhereILike("d.nome", termo)
          .orWhereILike("c.nome", termo)
          .orWhereILike("a.periodo", termo);
      });
    }

    return query;
  }
}
