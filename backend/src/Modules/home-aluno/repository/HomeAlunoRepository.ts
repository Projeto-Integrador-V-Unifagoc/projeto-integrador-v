import type { Knex } from "knex";
import db from "../../../database/index.js";

type Executor = Knex | Knex.Transaction;

const STATUS_ATIVO = ["ativa", "ATIVA", "ATIVO", "MATRICULADO", "REGULAR"];
const STATUS_MATRICULA_EM_CURSO = [...STATUS_ATIVO, "pendente", "PENDENTE"];
const STATUS_MATRICULA_HISTORICO = [...STATUS_MATRICULA_EM_CURSO, "concluida", "CONCLUIDA", "concluido", "CONCLUIDO"];
const STATUS_VINCULO_HISTORICO = [...STATUS_ATIVO, "concluida", "CONCLUIDA", "concluido", "CONCLUIDO", "aprovado", "APROVADO", "reprovado", "REPROVADO"];
const STATUS_OFERTA_HISTORICO = [...STATUS_ATIVO, "concluida", "CONCLUIDA", "concluido", "CONCLUIDO", "finalizada", "FINALIZADA"];

export class HomeAlunoRepository {
  private escopoCompetencias(query: Knex.QueryBuilder, alunoId: string, historico: boolean) {
    query.where("m.aluno_id", alunoId);
    if (historico) {
      return query
        .whereIn("mtd.status", STATUS_VINCULO_HISTORICO)
        .whereIn("m.status", STATUS_MATRICULA_HISTORICO)
        .whereIn("td.status", STATUS_OFERTA_HISTORICO);
    }
    return query
      .where("pl.ativo", true)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_MATRICULA_EM_CURSO)
      .whereIn("td.status", STATUS_ATIVO);
  }

  buscarAlunoPorUsuarioId(usuarioId: string, executor: Executor = db) {
    return executor("aluno").where({ usuario_id: usuarioId }).first();
  }

  // Disciplinas matriculadas pelo aluno no período letivo corrente (pl.ativo = true).
  listarDisciplinasDoAluno(alunoId: string, executor: Executor = db) {
    return executor("matricula_turma_disciplina as mtd")
      .join("matricula as m", "mtd.matricula_id", "m.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .join("professor as prof", "td.professor_id", "prof.id")
      .join("pessoa as p", "prof.pessoa_id", "p.id")
      .where("m.aluno_id", alunoId)
      .where("pl.ativo", true)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_MATRICULA_EM_CURSO)
      .whereIn("td.status", STATUS_ATIVO)
      .select(
        "td.id as turma_disciplina_id",
        "d.id as disciplina_id",
        "d.codigo as disciplina_codigo",
        "d.nome as disciplina_nome",
        "d.carga_horaria",
        "t.sigla as turma_sigla",
        "p.nome as professor_nome",
        "pl.id as periodo_id",
        "pl.codigo as periodo_codigo",
      )
      .orderBy("d.nome");
  }

  // Avaliacoes a vencer das turmas do aluno no periodo corrente (data_devolucao >= hoje).
  listarTarefasDoAluno(alunoId: string, executor: Executor = db) {
    return executor("matricula_turma_disciplina as mtd")
      .join("matricula as m", "mtd.matricula_id", "m.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .join("avaliacao as a", "a.turma_disciplina_id", "td.id")
      .where("m.aluno_id", alunoId)
      .where("pl.ativo", true)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_MATRICULA_EM_CURSO)
      .whereIn("td.status", STATUS_ATIVO)
      .whereNotNull("a.data_devolucao")
      .whereRaw("a.data_devolucao >= CURRENT_DATE")
      .select(
        "a.id as avaliacao_id",
        "a.tipo_avaliacao",
        "a.descricao_avaliacao",
        "a.data_devolucao",
        "a.valor",
        "d.nome as disciplina_nome",
        "td.id as turma_disciplina_id",
      )
      .orderBy("a.data_devolucao", "asc");
  }

  listarVinculosAtivosParaCompetencias(alunoId: string, historico = false, executor: Executor = db) {
    const query = executor("matricula_turma_disciplina as mtd")
      .join("matricula as m", "mtd.matricula_id", "m.id")
      .join("aluno as al", "m.aluno_id", "al.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id");
    this.escopoCompetencias(query, alunoId, historico);
    return query
      .distinct(
        "td.id as turma_disciplina_id",
        "mtd.id as matricula_turma_disciplina_id",
        "al.id as aluno_id",
        "d.id as disciplina_id",
        "d.codigo as disciplina_codigo",
        "d.nome as disciplina_nome",
        "t.sigla as turma_sigla",
        "pl.id as periodo_id",
        "pl.codigo as periodo_codigo",
        "pl.ano as periodo_ano",
        "pl.semestre as periodo_semestre",
        "pl.status as periodo_status",
        "pl.ativo as periodo_ativo",
      )
      .orderBy("pl.ano")
      .orderBy("pl.semestre")
      .orderBy("d.nome");
  }

  listarCompetenciasPlanejadasDoAluno(alunoId: string, historico = false, executor: Executor = db) {
    const query = executor("matricula_turma_disciplina as mtd")
      .join("matricula as m", "mtd.matricula_id", "m.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplina_competencia as dc", "cd.disciplina_id", "dc.disciplina_id")
      .join("competencia as c", "dc.competencia_id", "c.id");
    this.escopoCompetencias(query, alunoId, historico);
    return query
      .select(
        "td.id as turma_disciplina_id",
        "c.id as competencia_id",
        "c.codigo",
        "c.nome",
        "c.tipo",
        "dc.nivel_esperado",
        "dc.obrigatoria",
        "dc.ordem",
      )
      .orderBy("dc.ordem")
      .orderBy("c.nome");
  }

  listarAvaliacoesCompetenciasDoAluno(alunoId: string, historico = false, executor: Executor = db) {
    const query = executor("matricula_turma_disciplina as mtd")
      .join("matricula as m", "mtd.matricula_id", "m.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("avaliacao as av", "av.turma_disciplina_id", "td.id")
      .join("avaliacao_competencia as ac", "ac.avaliacao_id", "av.id");
    this.escopoCompetencias(query, alunoId, historico);
    return query
      .select(
        "td.id as turma_disciplina_id",
        "av.id as avaliacao_id",
        "ac.competencia_id",
        "ac.peso_percentual",
        "av.tipo_avaliacao",
        "av.descricao_avaliacao",
        "av.valor",
        "av.data_devolucao",
      )
      .orderByRaw("COALESCE(av.data_devolucao, av.data_lancamento::date) ASC");
  }

  listarNotasCompetenciasDoAluno(alunoId: string, historico = false, executor: Executor = db) {
    const query = executor("nota as n")
      .join("matricula_turma_disciplina as mtd", "n.matricula_turma_disciplina_id", "mtd.id")
      .join("matricula as m", "mtd.matricula_id", "m.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("avaliacao as av", function () {
        this.on("av.id", "=", "n.avaliacao_id").andOn("av.turma_disciplina_id", "=", "td.id");
      });
    this.escopoCompetencias(query, alunoId, historico);
    return query
      .select(
        "td.id as turma_disciplina_id",
        "mtd.id as matricula_turma_disciplina_id",
        "av.id as avaliacao_id",
        "n.valor as nota_valor",
      );
  }
}
