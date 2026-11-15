import db from "../../../database";

const STATUS_ATIVO = ["ativa", "ativo", "matriculado", "regular"];
const marcadores = STATUS_ATIVO.map(() => "?").join(",");

const total = (row: any) => Number(row?.total ?? 0);

export class HomeCoordenacaoRepository {
  listarPeriodos() {
    return db("periodo_letivo")
      .select("id", "codigo", "ano", "semestre", "data_inicio", "data_fim", "ativo", "status")
      .orderBy("ativo", "desc")
      .orderBy("ano", "desc")
      .orderBy("semestre", "desc");
  }

  async resumoPeriodo(periodoId: string) {
    const [turmas, ofertas, alunos, horarios, avaliacoes, avaliacoesMapeadas] = await Promise.all([
      db("turma").where("periodo_letivo_id", periodoId).whereRaw(`lower(status) in (${marcadores})`, STATUS_ATIVO).countDistinct({ total: "id" }).first(),
      db("turma_disciplina as td").join("turma as t", "td.turma_id", "t.id").where("t.periodo_letivo_id", periodoId).whereRaw(`lower(td.status) in (${marcadores})`, STATUS_ATIVO).countDistinct({ total: "td.id" }).first(),
      db("matricula as m").join("turma as t", "m.turma_id", "t.id").where("t.periodo_letivo_id", periodoId).whereRaw(`lower(m.status) in (${marcadores},?)`, [...STATUS_ATIVO, "pendente"]).countDistinct({ total: "m.aluno_id" }).first(),
      db("horario_turma_disciplina as h").join("turma_disciplina as td", "h.turma_disciplina_id", "td.id").join("turma as t", "td.turma_id", "t.id").where("t.periodo_letivo_id", periodoId).where("h.ativo", true).countDistinct({ total: "td.id" }).first(),
      db("avaliacao as av").join("turma_disciplina as td", "av.turma_disciplina_id", "td.id").join("turma as t", "td.turma_id", "t.id").where("t.periodo_letivo_id", periodoId).countDistinct({ total: "av.id" }).first(),
      db("avaliacao_competencia as ac").join("avaliacao as av", "ac.avaliacao_id", "av.id").join("turma_disciplina as td", "av.turma_disciplina_id", "td.id").join("turma as t", "td.turma_id", "t.id").where("t.periodo_letivo_id", periodoId).countDistinct({ total: "av.id" }).first(),
    ]);
    return {
      turmas_ativas: total(turmas), ofertas_ativas: total(ofertas), alunos_ativos: total(alunos),
      ofertas_com_horario: total(horarios), avaliacoes: total(avaliacoes), avaliacoes_mapeadas: total(avaliacoesMapeadas),
    };
  }

  listarPanoramaCursos(periodoId: string) {
    return db("curso as c")
      .join("turma as t", "t.curso_id", "c.id")
      .leftJoin("turma_disciplina as td", "td.turma_id", "t.id")
      .leftJoin("matricula as m", "m.turma_id", "t.id")
      .leftJoin("horario_turma_disciplina as h", function () {
        this.on("h.turma_disciplina_id", "=", "td.id").andOnVal("h.ativo", "=", true);
      })
      .where("t.periodo_letivo_id", periodoId)
      .whereRaw(`lower(t.status) in (${marcadores})`, STATUS_ATIVO)
      .groupBy("c.id", "c.codigo", "c.nome")
      .select("c.id", "c.codigo", "c.nome")
      .select(db.raw(`count(distinct t.id)::int as turmas_ativas`))
      .select(db.raw(`count(distinct td.id) filter (where lower(td.status) in (${marcadores}))::int as ofertas_ativas`, STATUS_ATIVO))
      .select(db.raw(`count(distinct m.aluno_id) filter (where lower(m.status) in (${marcadores},?))::int as alunos_ativos`, [...STATUS_ATIVO, "pendente"]))
      .select(db.raw("count(distinct td.id) filter (where h.id is not null)::int as ofertas_com_horario"))
      .orderBy("c.nome");
  }

  listarStatusMatrizes() {
    return db("matriz_curricular").select("status").count({ total: "id" }).groupBy("status");
  }

  listarDesempenhoCompetencias(periodoId: string, cursoId?: string) {
    const query = db("avaliacao_competencia as ac")
      .join("competencia as comp", "ac.competencia_id", "comp.id")
      .join("avaliacao as av", "ac.avaliacao_id", "av.id")
      .join("turma_disciplina as td", "av.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("matricula_turma_disciplina as mtd", "mtd.turma_disciplina_id", "td.id")
      .leftJoin("nota as n", function () {
        this.on("n.avaliacao_id", "=", "av.id").andOn("n.matricula_turma_disciplina_id", "=", "mtd.id");
      })
      .where("t.periodo_letivo_id", periodoId)
      .whereRaw(`lower(td.status) in (${marcadores})`, STATUS_ATIVO)
      .whereRaw(`lower(mtd.status) in (${marcadores})`, STATUS_ATIVO)
      .groupBy("comp.id", "comp.codigo", "comp.nome", "comp.tipo")
      .select("comp.id", "comp.codigo", "comp.nome", "comp.tipo")
      .select(db.raw("count(distinct td.id)::int as total_ofertas"))
      .select(db.raw("count(distinct t.curso_id)::int as total_cursos"))
      .select(db.raw("sum((av.valor * ac.peso_percentual / 100.0))::numeric as pontos_planejados"))
      .select(db.raw("sum(case when n.id is not null then (av.valor * ac.peso_percentual / 100.0) else 0 end)::numeric as pontos_avaliados"))
      .select(db.raw("sum(case when n.id is not null and av.valor > 0 then ((n.valor / av.valor * 100.0) * (av.valor * ac.peso_percentual / 100.0)) else 0 end)::numeric as soma_ponderada"));
    if (cursoId) query.where("t.curso_id", cursoId);
    return query;
  }

  buscarCurso(cursoId: string) {
    return db("curso").where("id", cursoId).select("id", "codigo", "nome").first();
  }

  listarMatrizesCurso(cursoId: string) {
    return db("matriz_curricular as mc")
      .leftJoin("curso_disciplina as cd", "cd.matriz_curricular_id", "mc.id")
      .where("mc.curso_id", cursoId)
      .groupBy("mc.id")
      .select("mc.id", "mc.codigo", "mc.versao", "mc.status", "mc.vigencia_inicio", "mc.vigencia_fim")
      .select(db.raw("count(distinct cd.disciplina_id)::int as total_disciplinas"))
      .select(db.raw("coalesce(sum(cd.carga_horaria) filter (where cd.ativo = true), 0)::int as carga_horaria"))
      .orderByRaw("case mc.status when 'VIGENTE' then 0 when 'RASCUNHO' then 1 else 2 end")
      .orderBy("mc.vigencia_inicio", "desc");
  }

  listarTurmasCurso(cursoId: string, periodoId: string) {
    return db("turma as t")
      .leftJoin("turma_disciplina as td", "td.turma_id", "t.id")
      .leftJoin("matricula as m", "m.turma_id", "t.id")
      .leftJoin("horario_turma_disciplina as h", function () {
        this.on("h.turma_disciplina_id", "=", "td.id").andOnVal("h.ativo", "=", true);
      })
      .where("t.curso_id", cursoId)
      .where("t.periodo_letivo_id", periodoId)
      .groupBy("t.id")
      .select("t.id", "t.sigla", "t.descricao", "t.turno", "t.periodo_curricular", "t.capacidade_alunos", "t.status")
      .select(db.raw(`count(distinct td.id) filter (where lower(td.status) in (${marcadores}))::int as ofertas_ativas`, STATUS_ATIVO))
      .select(db.raw(`count(distinct m.aluno_id) filter (where lower(m.status) in (${marcadores},?))::int as alunos_ativos`, [...STATUS_ATIVO, "pendente"]))
      .select(db.raw("count(distinct td.id) filter (where h.id is not null)::int as ofertas_com_horario"))
      .orderBy("t.sigla");
  }

  listarOfertasCurso(cursoId: string, periodoId: string) {
    return db("turma_disciplina as td")
      .join("turma as t", "td.turma_id", "t.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .join("professor as prof", "td.professor_id", "prof.id")
      .join("pessoa as p", "prof.pessoa_id", "p.id")
      .leftJoin("matricula_turma_disciplina as mtd", "mtd.turma_disciplina_id", "td.id")
      .leftJoin("horario_turma_disciplina as h", function () {
        this.on("h.turma_disciplina_id", "=", "td.id").andOnVal("h.ativo", "=", true);
      })
      .leftJoin("avaliacao as av", "av.turma_disciplina_id", "td.id")
      .leftJoin("avaliacao_competencia as ac", "ac.avaliacao_id", "av.id")
      .where("t.curso_id", cursoId)
      .where("t.periodo_letivo_id", periodoId)
      .whereRaw(`lower(td.status) in (${marcadores})`, STATUS_ATIVO)
      .groupBy("td.id", "t.id", "d.id", "prof.id", "p.id")
      .select(
        "td.id", "td.status", "t.id as turma_id", "t.sigla as turma_sigla", "t.turno",
        "d.id as disciplina_id", "d.codigo as disciplina_codigo", "d.nome as disciplina_nome",
        "prof.id as professor_id", "p.nome as professor_nome",
      )
      .select(db.raw(`count(distinct mtd.id) filter (where lower(mtd.status) in (${marcadores}))::int as total_alunos`, STATUS_ATIVO))
      .select(db.raw("count(distinct h.id)::int as total_horarios"))
      .select(db.raw("count(distinct av.id)::int as total_avaliacoes"))
      .select(db.raw("count(distinct av.id) filter (where ac.id is not null)::int as avaliacoes_mapeadas"))
      .orderBy("t.sigla")
      .orderBy("d.nome");
  }

  listarHorariosCurso(cursoId: string, periodoId: string) {
    return db("horario_turma_disciplina as h")
      .join("turma_disciplina as td", "h.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .where("t.curso_id", cursoId)
      .where("t.periodo_letivo_id", periodoId)
      .where("h.ativo", true)
      .select("h.id", "h.turma_disciplina_id", "h.dia_semana", "h.hora_inicio", "h.hora_fim", "h.local", "h.vigencia_inicio", "h.vigencia_fim")
      .orderBy("h.dia_semana")
      .orderBy("h.hora_inicio");
  }

  async diagnosticoQualidade(periodoId: string) {
    const [disciplinas, semEmenta, semCompetencias, cargaIncompleta, cursos, cursosSemMatriz, turmas, turmasSemHorario, avaliacoes, avaliacoesSemCompetencia] = await Promise.all([
      db("disciplinas").where("ativo", true).count({ total: "id" }).first(),
      db("disciplinas").where("ativo", true).where((q) => q.whereNull("ementa").orWhereRaw("btrim(ementa) = ''")).count({ total: "id" }).first(),
      db("disciplinas as d").where("d.ativo", true).whereNotExists(db("disciplina_competencia as dc").select(db.raw("1")).whereRaw("dc.disciplina_id = d.id")).count({ total: "d.id" }).first(),
      db("disciplinas").where("ativo", true).where((q) => q.whereNull("area_conhecimento").orWhereNull("carga_horaria_teorica").orWhereNull("carga_horaria_pratica").orWhereNull("carga_horaria_laboratorio").orWhereNull("carga_horaria_extensao")).count({ total: "id" }).first(),
      db("curso").count({ total: "id" }).first(),
      db("curso as c").whereNotExists(db("matriz_curricular as mc").select(db.raw("1")).whereRaw("mc.curso_id = c.id").where("mc.status", "VIGENTE")).count({ total: "c.id" }).first(),
      db("turma").where("periodo_letivo_id", periodoId).whereRaw(`lower(status) in (${marcadores})`, STATUS_ATIVO).count({ total: "id" }).first(),
      db("turma as t").where("t.periodo_letivo_id", periodoId).whereRaw(`lower(t.status) in (${marcadores})`, STATUS_ATIVO).whereNotExists(db("turma_disciplina as td").join("horario_turma_disciplina as h", "h.turma_disciplina_id", "td.id").select(db.raw("1")).whereRaw("td.turma_id = t.id").where("h.ativo", true)).count({ total: "t.id" }).first(),
      db("avaliacao as av").join("turma_disciplina as td", "av.turma_disciplina_id", "td.id").join("turma as t", "td.turma_id", "t.id").where("t.periodo_letivo_id", periodoId).countDistinct({ total: "av.id" }).first(),
      db("avaliacao as av").join("turma_disciplina as td", "av.turma_disciplina_id", "td.id").join("turma as t", "td.turma_id", "t.id").where("t.periodo_letivo_id", periodoId).whereNotExists(db("avaliacao_competencia as ac").select(db.raw("1")).whereRaw("ac.avaliacao_id = av.id")).countDistinct({ total: "av.id" }).first(),
    ]);
    return {
      disciplinas: total(disciplinas), disciplinas_sem_ementa: total(semEmenta), disciplinas_sem_competencias: total(semCompetencias), disciplinas_carga_incompleta: total(cargaIncompleta),
      cursos: total(cursos), cursos_sem_matriz: total(cursosSemMatriz), turmas: total(turmas), turmas_sem_horario: total(turmasSemHorario),
      avaliacoes: total(avaliacoes), avaliacoes_sem_competencia: total(avaliacoesSemCompetencia),
    };
  }
}

