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
    const totalAulas = "COUNT(DISTINCT f.aula_id)";
    const presencas = "SUM(CASE WHEN f.status = 'PRESENTE' THEN 1 ELSE 0 END)";
    const faltas = "SUM(CASE WHEN f.status = 'AUSENTE' THEN 1 ELSE 0 END)";

    const query = db("matricula_turma_disciplina as mtd")
      .join("matricula as m", "m.id", "mtd.matricula_id")
      .join("aluno as a", "a.id", "m.aluno_id")
      .join("pessoa as p", "p.id", "a.pessoa_id")
      .leftJoin("curso as c", "c.id", "m.curso_id")
      .join("turma_disciplina as td", "td.id", "mtd.turma_disciplina_id")
      .join("turma as t", "t.id", "td.turma_id")
      .join("periodo_letivo as pl", "pl.id", "t.periodo_letivo_id")
      .join("curso_disciplina as cd", "cd.id", "td.curso_disciplina_id")
      .join("disciplinas as d", "d.id", "cd.disciplina_id")
      .leftJoin(
        "avaliacao as av",
        db.raw(
          "(av.matricula_turma_disciplina_id = mtd.id OR (av.matricula_turma_disciplina_id IS NULL AND av.turma_disciplina_id = td.id))"
        )
      )
      .leftJoin("frequencia as f", "f.matricula_turma_disciplina_id", "mtd.id")
      .select(
        "a.id as alunoId",
        "a.matricula",
        "p.nome as aluno",
        "m.curso_id as cursoId",
        db.raw("COALESCE(c.nome, 'Curso nao informado') as curso"),
        db.raw("COALESCE(t.sigla, t.descricao, a.periodo, 'Periodo nao informado') as periodo"),
        "td.id as turmaId",
        "d.id as disciplinaId",
        db.raw("COALESCE(d.nome, 'Sem disciplina vinculada') as disciplina"),
        db.raw("COALESCE(cd.carga_horaria, d.carga_horaria, 0) as \"cargaHoraria\""),
        db.raw("CONCAT(pl.ano, '/', pl.semestre) as ano"),
        db.raw("ROUND(AVG(av.nota)::numeric, 2) as nota"),
        db.raw(`${totalAulas}::int as "totalAulas"`),
        db.raw(`${presencas}::int as presencas`),
        db.raw(`${faltas}::int as faltas`),
        db.raw(
          `CASE WHEN ${totalAulas} = 0 THEN NULL ELSE ROUND(((${presencas})::numeric / ${totalAulas}) * 100, 2) END as frequencia`
        ),
        db.raw(`
          CASE
            WHEN AVG(av.nota) IS NOT NULL AND AVG(av.nota) < 5 THEN 'reprovado'
            WHEN AVG(av.nota) IS NOT NULL AND AVG(av.nota) < 7 THEN 'recuperacao'
            WHEN ${totalAulas} > 0 AND (((${presencas})::numeric / ${totalAulas}) * 100) < 75 THEN 'risco'
            WHEN ${totalAulas} > 0 AND (((${presencas})::numeric / ${totalAulas}) * 100) <= 80 THEN 'alerta'
            ELSE 'regular'
          END as situacao
        `)
      )
      .whereIn("mtd.status", ["ativa", "ATIVA", "MATRICULADO", "REGULAR"])
      .whereIn("m.status", ["ativa", "ATIVA", "MATRICULADO", "REGULAR"])
      .groupBy(
        "a.id",
        "a.matricula",
        "p.nome",
        "m.curso_id",
        "c.nome",
        "a.periodo",
        "t.sigla",
        "t.descricao",
        "td.id",
        "d.id",
        "d.nome",
        "cd.carga_horaria",
        "d.carga_horaria",
        "pl.ano",
        "pl.semestre"
      )
      .orderBy("p.nome")
      .orderBy("pl.ano")
      .orderBy("pl.semestre")
      .orderBy("d.nome");

    if (filtros.alunoId) {
      query.where("a.id", filtros.alunoId);
    }

    if (filtros.matricula) {
      query.where("a.matricula", filtros.matricula);
    }

    if (filtros.cursoId) {
      query.where("m.curso_id", filtros.cursoId);
    }

    if (filtros.turmaId) {
      query.where("td.id", filtros.turmaId);
    }

    if (filtros.turmaIdsPermitidos?.length) {
      query.whereIn("td.id", filtros.turmaIdsPermitidos);
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
          .orWhereILike("t.sigla", termo)
          .orWhereILike("t.descricao", termo);
      });
    }

    return query;
  }

  async contarFontesAcademicas() {
    const tabelas = [
      "aluno",
      "professor",
      "matricula",
      "turma_disciplina",
      "avaliacao",
      "aula",
      "frequencia",
    ];
    const pares = await Promise.all(
      tabelas.map(async (tabela) => {
        const resultado = await db(tabela).count<{ total: string }>("id as total");
        const total = resultado[0]?.total ?? 0;
        return [tabela, Number(total || 0)] as const;
      })
    );

    return Object.fromEntries(pares);
  }
}
