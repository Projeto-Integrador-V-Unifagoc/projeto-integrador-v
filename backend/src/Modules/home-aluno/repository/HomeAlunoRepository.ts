import type { Knex } from "knex";
import db from "../../../database/index.js";

type Executor = Knex | Knex.Transaction;

const STATUS_ATIVO = ["ativa", "ATIVA", "ATIVO", "MATRICULADO", "REGULAR"];

export class HomeAlunoRepository {
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
      .whereIn("m.status", STATUS_ATIVO)
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
      .whereIn("m.status", STATUS_ATIVO)
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
}
