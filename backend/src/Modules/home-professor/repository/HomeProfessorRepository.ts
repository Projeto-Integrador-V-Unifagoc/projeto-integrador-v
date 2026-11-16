import db from "../../../database";

const STATUS_ATIVO = ["ativa", "ativo", "matriculado", "regular"];
const STATUS_MATRICULA = [...STATUS_ATIVO, "pendente"];

export class HomeProfessorRepository {
  buscarProfessorPorUsuarioId(usuarioId: string) {
    return db("professor as prof")
      .join("pessoa as p", "prof.pessoa_id", "p.id")
      .where("prof.usuario_id", usuarioId)
      .select("prof.id", "prof.ativo", "p.nome")
      .first();
  }

  listarPeriodos(professorId: string) {
    return db("turma_disciplina as td")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .where("td.professor_id", professorId)
      .whereRaw(`lower(td.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .distinct("pl.id", "pl.codigo", "pl.ano", "pl.semestre", "pl.ativo", "pl.status")
      .orderBy("pl.ano", "desc")
      .orderBy("pl.semestre", "desc");
  }

  listarAtribuicoes(professorId: string, periodoId: string, turmaDisciplinaId?: string) {
    const query = db("turma_disciplina as td")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("curso as c", "t.curso_id", "c.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .where("td.professor_id", professorId)
      .where("pl.id", periodoId)
      .whereRaw(`lower(td.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .select(
        "td.id as turma_disciplina_id", "td.status", "t.id as turma_id", "t.sigla as turma_sigla",
        "t.descricao as turma_descricao", "t.turno", "c.id as curso_id", "c.nome as curso_nome",
        "d.id as disciplina_id", "d.codigo as disciplina_codigo", "d.nome as disciplina_nome",
        "d.area_conhecimento", "d.ementa", "cd.carga_horaria", "pl.id as periodo_id", "pl.codigo as periodo_codigo",
      )
      .orderBy("d.nome")
      .orderBy("t.sigla");
    if (turmaDisciplinaId) query.where("td.id", turmaDisciplinaId);
    return query;
  }

  listarAlunos(professorId: string, periodoId: string, turmaDisciplinaId?: string) {
    const query = db("matricula_turma_disciplina as mtd")
      .join("matricula as m", "mtd.matricula_id", "m.id")
      .join("aluno as al", "m.aluno_id", "al.id")
      .join("pessoa as p", "al.pessoa_id", "p.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .where("td.professor_id", professorId)
      .where("t.periodo_letivo_id", periodoId)
      .whereRaw(`lower(td.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .whereRaw(`lower(mtd.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .whereRaw(`lower(m.status) in (${STATUS_MATRICULA.map(() => "?").join(",")})`, STATUS_MATRICULA)
      .select(
        "td.id as turma_disciplina_id", "mtd.id as matricula_turma_disciplina_id",
        "al.id as aluno_id", "al.matricula", "p.nome as aluno_nome",
      )
      .orderBy("p.nome");
    if (turmaDisciplinaId) query.where("td.id", turmaDisciplinaId);
    return query;
  }

  listarNotas(professorId: string, periodoId: string, turmaDisciplinaId?: string) {
    const query = db("nota as n")
      .join("avaliacao as av", "n.avaliacao_id", "av.id")
      .join("matricula_turma_disciplina as mtd", "n.matricula_turma_disciplina_id", "mtd.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .where("td.professor_id", professorId)
      .where("t.periodo_letivo_id", periodoId)
      .whereRaw(`lower(td.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .select(
        "td.id as turma_disciplina_id", "mtd.id as matricula_turma_disciplina_id",
        "av.id as avaliacao_id", "n.valor as nota_valor",
      );
    if (turmaDisciplinaId) query.where("td.id", turmaDisciplinaId);
    return query;
  }

  listarFrequencias(professorId: string, periodoId: string, turmaDisciplinaId?: string) {
    const query = db("frequencia as f")
      .join("matricula_turma_disciplina as mtd", "f.matricula_turma_disciplina_id", "mtd.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .where("td.professor_id", professorId)
      .where("t.periodo_letivo_id", periodoId)
      .whereRaw(`lower(td.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .select("td.id as turma_disciplina_id", "mtd.id as matricula_turma_disciplina_id")
      .sum({
        presencas: db.raw("CASE WHEN f.status = 'PRESENTE' THEN 1 ELSE 0 END"),
        faltas: db.raw("CASE WHEN f.status = 'AUSENTE' THEN 1 ELSE 0 END"),
      })
      .groupBy("td.id", "mtd.id");
    if (turmaDisciplinaId) query.where("td.id", turmaDisciplinaId);
    return query;
  }

  listarAvaliacoes(professorId: string, periodoId: string, turmaDisciplinaId?: string) {
    const query = db("avaliacao as av")
      .join("turma_disciplina as td", "av.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .leftJoin("nota as n", "n.avaliacao_id", "av.id")
      .where("td.professor_id", professorId)
      .where("t.periodo_letivo_id", periodoId)
      .whereRaw(`lower(td.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .select(
        "av.id", "av.turma_disciplina_id", "av.tipo_avaliacao", "av.descricao_avaliacao",
        "av.data_lancamento", "av.data_devolucao", "av.valor",
      )
      .count({ notas_lancadas: "n.id" })
      .avg({ media_notas: "n.valor" })
      .groupBy("av.id")
      .orderByRaw("COALESCE(av.data_devolucao, av.data_lancamento::date) ASC");
    if (turmaDisciplinaId) query.where("td.id", turmaDisciplinaId);
    return query;
  }

  // Aulas já cadastradas (data <= agora) em que falta registro de frequência de algum aluno ativo.
  // Mesmo conceito do "naoLancadas" do FrequenciaService. O aluno só conta como esperado se já estava
  // vinculado à disciplina na data da aula (data_vinculo) ou se já tem registro nela: quem entrou depois
  // não gera pendência retroativa. Uma passada só (GROUP BY + HAVING) devolve apenas as aulas pendentes.
  listarChamadas(professorId: string, periodoId: string) {
    return db("aula as au")
      .join("turma_disciplina as td", "au.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("matricula_turma_disciplina as mtd", "mtd.turma_disciplina_id", "au.turma_disciplina_id")
      .join("matricula as m", "mtd.matricula_id", "m.id")
      .leftJoin("frequencia as f", (join) => join.on("f.aula_id", "au.id").andOn("f.matricula_turma_disciplina_id", "mtd.id"))
      .where("td.professor_id", professorId)
      .where("t.periodo_letivo_id", periodoId)
      .whereRaw(`lower(td.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .whereRaw(`lower(mtd.status) in (${STATUS_ATIVO.map(() => "?").join(",")})`, STATUS_ATIVO)
      .whereRaw(`lower(m.status) in (${STATUS_MATRICULA.map(() => "?").join(",")})`, STATUS_MATRICULA)
      .whereRaw("au.data <= now()")
      .whereRaw("(f.id is not null or mtd.data_vinculo <= (au.data at time zone 'America/Sao_Paulo')::date)")
      .select("au.id as aula_id", "au.turma_disciplina_id", "au.data")
      .count({ registrados: "f.id" })
      .count({ esperados: "mtd.id" })
      .groupBy("au.id")
      .havingRaw("count(f.id) < count(mtd.id)")
      .orderBy("au.data", "asc");
  }

  listarCompetencias(disciplinaId: string) {
    return db("disciplina_competencia as dc")
      .join("competencia as c", "dc.competencia_id", "c.id")
      .where("dc.disciplina_id", disciplinaId)
      .select("c.id", "c.codigo", "c.nome", "c.tipo", "dc.nivel_esperado", "dc.obrigatoria")
      .orderBy("dc.ordem")
      .orderBy("c.nome");
  }
}
