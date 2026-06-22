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
    const notasPorMatricula = db.raw(`
      (
        SELECT
          av.turma_disciplina_id,
          n.matricula_turma_disciplina_id,
          CASE
            WHEN SUM(av.valor) > 0
              THEN ROUND((SUM(n.valor)::numeric / SUM(av.valor)::numeric) * 10, 2)
            ELSE NULL
          END AS nota
        FROM piv.avaliacao av
        JOIN piv.nota n ON n.avaliacao_id = av.id
        WHERE av.tipo_avaliacao <> 'RECUPERACAO'
        GROUP BY av.turma_disciplina_id, n.matricula_turma_disciplina_id
      ) as nt
    `);

    const frequenciaPorMatricula = db.raw(`
      (
        SELECT
          matricula_turma_disciplina_id,
          COUNT(DISTINCT aula_id)::int AS "totalAulas",
          SUM(CASE WHEN status = 'PRESENTE' THEN 1 ELSE 0 END)::int AS presencas,
          SUM(CASE WHEN status = 'AUSENTE' THEN 1 ELSE 0 END)::int AS faltas,
          CASE
            WHEN COUNT(DISTINCT aula_id) = 0 THEN NULL
            ELSE ROUND((SUM(CASE WHEN status = 'PRESENTE' THEN 1 ELSE 0 END)::numeric / COUNT(DISTINCT aula_id)) * 100, 2)
          END AS frequencia
        FROM piv.frequencia
        GROUP BY matricula_turma_disciplina_id
      ) as fr
    `);

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
      .leftJoin(notasPorMatricula, function () {
        this.on("nt.turma_disciplina_id", "td.id").andOn("nt.matricula_turma_disciplina_id", "mtd.id");
      })
      .leftJoin(frequenciaPorMatricula, "fr.matricula_turma_disciplina_id", "mtd.id")
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
        "nt.nota",
        db.raw(`COALESCE(fr."totalAulas", 0)::int as "totalAulas"`),
        db.raw("COALESCE(fr.presencas, 0)::int as presencas"),
        db.raw("COALESCE(fr.faltas, 0)::int as faltas"),
        "fr.frequencia",
        db.raw(`
          CASE
            WHEN nt.nota IS NOT NULL AND nt.nota < 5 THEN 'reprovado'
            WHEN nt.nota IS NOT NULL AND nt.nota < 7 THEN 'recuperacao'
            WHEN fr.frequencia IS NOT NULL AND fr.frequencia < 75 THEN 'risco'
            WHEN fr.frequencia IS NOT NULL AND fr.frequencia <= 80 THEN 'alerta'
            ELSE 'regular'
          END as situacao
        `)
      )
      .whereIn("mtd.status", ["ativa", "ATIVA", "MATRICULADO", "REGULAR"])
      .whereIn("m.status", ["ativa", "ATIVA", "MATRICULADO", "REGULAR"])
      .orderBy("p.nome")
      .orderBy("pl.ano")
      .orderBy("pl.semestre")
      .orderBy("d.nome");

    this.aplicarFiltrosAcademicos(query, filtros);

    return query;
  }

  async listarNotasDetalhadas(filtros: FiltrosRelatorioAcademico) {
    const query = db("nota as n")
      .join("avaliacao as av", "av.id", "n.avaliacao_id")
      .join("matricula_turma_disciplina as mtd", "mtd.id", "n.matricula_turma_disciplina_id")
      .join("matricula as m", "m.id", "mtd.matricula_id")
      .join("aluno as a", "a.id", "m.aluno_id")
      .join("pessoa as p", "p.id", "a.pessoa_id")
      .leftJoin("curso as c", "c.id", "m.curso_id")
      .join("turma_disciplina as td", "td.id", "mtd.turma_disciplina_id")
      .join("turma as t", "t.id", "td.turma_id")
      .join("periodo_letivo as pl", "pl.id", "t.periodo_letivo_id")
      .join("curso_disciplina as cd", "cd.id", "td.curso_disciplina_id")
      .join("disciplinas as d", "d.id", "cd.disciplina_id")
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
        db.raw("COALESCE(NULLIF(av.descricao_avaliacao, ''), av.tipo_avaliacao) as avaliacao"),
        "av.tipo_avaliacao as tipoAvaliacao",
        "av.valor as valorAvaliacao",
        "av.data_lancamento as dataAvaliacao",
        "n.valor as nota",
        db.raw(`
          CASE
            WHEN av.valor > 0 AND ((n.valor::numeric / av.valor::numeric) * 100) < 60 THEN 'recuperacao'
            ELSE 'regular'
          END as situacao
        `)
      )
      .whereIn("mtd.status", ["ativa", "ATIVA", "MATRICULADO", "REGULAR"])
      .whereIn("m.status", ["ativa", "ATIVA", "MATRICULADO", "REGULAR"])
      .orderBy("p.nome")
      .orderBy("pl.ano")
      .orderBy("pl.semestre")
      .orderBy("d.nome")
      .orderBy("av.data_lancamento");

    this.aplicarFiltrosAcademicos(query, filtros, true);

    return query;
  }

  private aplicarFiltrosAcademicos(query: any, filtros: FiltrosRelatorioAcademico, incluirAvaliacao = false) {
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
      query.where((builder: any) => {
        const busca = builder
          .whereILike("p.nome", termo)
          .orWhereILike("d.nome", termo)
          .orWhereILike("c.nome", termo)
          .orWhereILike("t.sigla", termo)
          .orWhereILike("t.descricao", termo);

        if (incluirAvaliacao) {
          busca
            .orWhereILike("av.descricao_avaliacao", termo)
            .orWhereILike("av.tipo_avaliacao", termo);
        }
      });
    }
  }

  async contarFontesAcademicas() {
    const tabelas = [
      "aluno",
      "professor",
      "matricula",
      "turma_disciplina",
      "avaliacao",
      "nota",
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
