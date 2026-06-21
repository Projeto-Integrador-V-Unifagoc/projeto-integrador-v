import type { Knex } from "knex";
import db from "../../../database/index.js";
import { FrequenciaMapper, type StatusFrequencia } from "../models/Frequencia";

const STATUS_ATIVO = ["ativa", "ATIVA", "ATIVO", "MATRICULADO", "REGULAR"];

export class FrequenciaRepository {
  buscarProfessorPorUsuarioId(usuarioId: string) { return db("professor").where({ usuario_id: usuarioId }).first(); }
  buscarAlunoPorUsuarioId(usuarioId: string) { return db("aluno").where({ usuario_id: usuarioId }).first(); }
  professorPossuiTurma(professorId: string, turmaDisciplinaId: string) {
    return db("turma_disciplina").where({ id: turmaDisciplinaId, professor_id: professorId }).whereIn("status", STATUS_ATIVO).first().then(Boolean);
  }
  alunoPertenceATurma(alunoId: string, turmaDisciplinaId: string) {
    return db("matricula_turma_disciplina as mtd").join("matricula as m", "mtd.matricula_id", "m.id")
      .where("m.aluno_id", alunoId).where("mtd.turma_disciplina_id", turmaDisciplinaId)
      .whereIn("mtd.status", STATUS_ATIVO).whereIn("m.status", STATUS_ATIVO).first().then(Boolean);
  }
  professorPossuiAluno(professorId: string, alunoId: string) {
    return db("turma_disciplina as td").join("matricula_turma_disciplina as mtd", "mtd.turma_disciplina_id", "td.id")
      .join("matricula as m", "mtd.matricula_id", "m.id").where("td.professor_id", professorId)
      .where("m.aluno_id", alunoId).whereIn("td.status", STATUS_ATIVO).whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_ATIVO).first().then(Boolean);
  }

  listarTurmas(professorId?: string, alunoId?: string) {
    const q = db("turma_disciplina as td").join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("curso as c", "t.curso_id", "c.id").join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .select("td.id", "td.professor_id", "t.id as turma_id", "t.sigla as turma_sigla", "t.descricao as turma_descricao",
        "pl.codigo as periodo_codigo", "pl.data_inicio", "pl.data_fim", "pl.status as periodo_status",
        "d.id as disciplina_id", "d.nome as disciplina_nome", "d.codigo as disciplina_codigo", "c.id as curso_id", "c.nome as curso_nome")
      .whereIn("td.status", STATUS_ATIVO).orderBy("d.nome");
    if (professorId) q.where("td.professor_id", professorId);
    if (alunoId) q.join("matricula_turma_disciplina as mtd", "mtd.turma_disciplina_id", "td.id")
      .join("matricula as m", "mtd.matricula_id", "m.id").where("m.aluno_id", alunoId)
      .whereIn("mtd.status", STATUS_ATIVO).whereIn("m.status", STATUS_ATIVO);
    return q;
  }
  listarLocais() { return db("local").select("id", "codigo").orderBy("codigo"); }
  buscarTurma(id: string) {
    return db("turma_disciplina as td").join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id").join("disciplinas as d", "cd.disciplina_id", "d.id")
      .where("td.id", id).select("td.*", "t.status as turma_status", "pl.codigo as periodo_codigo", "pl.data_inicio", "pl.data_fim",
        "pl.status as periodo_status", "pl.ativo as periodo_ativo", "d.id as disciplina_id", "d.nome as disciplina_nome").first();
  }
  buscarAulaPorId(id: string) { return db("aula").where({ id }).first(); }

  listarAlunosAtivosDaTurma(id: string) {
    return db("matricula_turma_disciplina as mtd").join("matricula as m", "mtd.matricula_id", "m.id")
      .join("aluno as a", "m.aluno_id", "a.id").join("pessoa as p", "a.pessoa_id", "p.id")
      .where("mtd.turma_disciplina_id", id).whereIn("mtd.status", STATUS_ATIVO).whereIn("m.status", STATUS_ATIVO)
      .select("mtd.id as matricula_turma_disciplina_id", "a.id as aluno_id", "a.matricula", "p.nome", "mtd.status").orderBy("p.nome");
  }
  async contarMatriculasIrregulares(id: string) {
    const [{ total }] = await db("matricula_turma_disciplina as mtd").join("matricula as m", "mtd.matricula_id", "m.id")
      .where("mtd.turma_disciplina_id", id).where((q) => q.whereNotIn("mtd.status", STATUS_ATIVO).orWhereNotIn("m.status", STATUS_ATIVO)).count("mtd.id as total");
    return Number(total || 0);
  }
  listarRegistrosDaChamada(id: string, data: string) {
    return this.baseRegistro().where("mtd.turma_disciplina_id", id).whereRaw("(aula.data AT TIME ZONE 'America/Sao_Paulo')::date = ?::date", [data]).orderBy("p.nome");
  }
  async calcularPercentualMatriculaTurmaDisciplina(id: string) {
    const [r] = await db("frequencia").where({ matricula_turma_disciplina_id: id }).count("id as total")
      .sum({ presencas: db.raw("CASE WHEN status = 'PRESENTE' THEN 1 ELSE 0 END") });
    const total = Number(r.total || 0); return total ? Number((Number(r.presencas || 0) / total * 100).toFixed(2)) : 100;
  }
  async salvarChamadaAtomica(args: { turmaDisciplinaId: string; aulaId?: string; localId?: string; data: string; professorId: string; usuarioId: string; perfil: string; registros: Array<{ matriculaId: string; status: StatusFrequencia }> }) {
    return db.transaction(async (trx) => {
      let aula = args.aulaId ? await trx("aula").where({ id: args.aulaId }).forUpdate().first() :
        await trx("aula").where("turma_disciplina_id", args.turmaDisciplinaId).whereRaw("(data AT TIME ZONE 'America/Sao_Paulo')::date = ?::date", [args.data]).forUpdate().first();
      if (aula && (aula.turma_disciplina_id !== args.turmaDisciplinaId || String(aula.professor_id) !== args.professorId || this.dataIso(aula.data) !== args.data)) throw Object.assign(new Error("A aula não pertence à atribuição e data informadas."), { codigoDominio: "AULA_DIVERGENTE" });
      if (!aula) {
        if (!args.localId || !(await trx("local").where({ id: args.localId }).first())) throw Object.assign(new Error("Selecione um local de aula válido."), { codigoDominio: "LOCAL_INVALIDO" });
        [aula] = await trx("aula").insert({ turma_disciplina_id: args.turmaDisciplinaId, professor_id: args.professorId, local_id: args.localId, data: `${args.data}T12:00:00-03:00` }).returning("*");
      }
      const existentes = await trx("frequencia").where({ aula_id: aula.id }).forUpdate();
      if (existentes.some((r) => Date.now() > new Date(r.lancada_em || r.created_at).getTime() + 7 * 86400000)) throw Object.assign(new Error("Prazo de edição de 7 dias expirado."), { codigoDominio: "PRAZO_EXPIRADO" });
      const porMatricula = new Map(existentes.map((r) => [String(r.matricula_turma_disciplina_id), r]));
      const ids: string[] = [];
      for (const item of args.registros) {
        const anterior = porMatricula.get(item.matriculaId);
        if (anterior) {
          const [atual] = await trx("frequencia").where({ id: anterior.id }).update({ status: item.status, data: args.data, justificativa: item.status === "PRESENTE" ? null : anterior.justificativa, justificativa_motivo: item.status === "PRESENTE" ? null : anterior.justificativa_motivo, justificativa_observacao: item.status === "PRESENTE" ? null : anterior.justificativa_observacao, alterada_por_usuario_id: args.usuarioId, updated_at: trx.fn.now() }).returning("*");
          ids.push(atual.id); await this.auditar(trx, atual.id, args, "CORRECAO", anterior, atual);
        } else {
          const [novo] = await trx("frequencia").insert({ aula_id: aula.id, matricula_turma_disciplina_id: item.matriculaId, status: item.status, data: args.data, responsavel_lancamento_usuario_id: args.usuarioId, lancada_em: trx.fn.now() }).returning("*");
          ids.push(novo.id); await this.auditar(trx, novo.id, args, "LANCAMENTO", null, novo);
        }
      }
      return { aulaId: aula.id, registros: await this.baseRegistro(trx).whereIn("frequencia.id", ids).then((rows) => rows.map(FrequenciaMapper.registro)) };
    });
  }
  buscarRegistroPorId(id: string) { return this.baseRegistro().where("frequencia.id", id).first().then((r) => r ? FrequenciaMapper.registro(r) : null); }
  async salvarJustificativa(id: string, dados: any) {
    return db.transaction(async (trx) => {
      const anterior = await trx("frequencia").where({ id }).forUpdate().first();
      const [atual] = await trx("frequencia").where({ id }).update({ justificativa: dados.motivo, justificativa_motivo: dados.motivo, justificativa_observacao: dados.observacao || null, justificada_por_usuario_id: dados.usuarioId, justificada_por_perfil: dados.perfil, justificada_em: trx.fn.now(), updated_at: trx.fn.now() }).returning("*");
      await this.auditar(trx, id, dados, anterior.justificativa_motivo || anterior.justificativa ? "JUSTIFICATIVA_SUBSTITUIDA" : "JUSTIFICATIVA_INCLUIDA", anterior, atual);
      const row = await this.baseRegistro(trx).where("frequencia.id", id).first();
      return row ? FrequenciaMapper.registro(row) : null;
    });
  }
  listarHistoricoAluno(alunoId: string, professorId?: string) {
    const q = this.baseRegistro().where("m.aluno_id", alunoId).orderBy("aula.data", "desc");
    if (professorId) q.where("td.professor_id", professorId);
    return q;
  }
  async buscarConsolidadoTurma(id: string, filtros: { dataInicio?: string; dataFim?: string } = {}) {
    const alunos = await this.listarAlunosAtivosDaTurma(id); const turma = await this.buscarTurma(id);
    const aulasQ = db("aula").where("turma_disciplina_id", id).where("aula.data", "<=", db.fn.now()); this.filtrarData(aulasQ, filtros, "aula.data");
    const aulas = await aulasQ.select("id"); const aulaIds = aulas.map((a) => a.id);
    const registros = aulaIds.length ? await db("frequencia").whereIn("aula_id", aulaIds).whereIn("matricula_turma_disciplina_id", alunos.map((a) => a.matricula_turma_disciplina_id)) : [];
    return { totalAulas: aulas.length, rows: alunos.map((aluno) => { const rs = registros.filter((r) => r.matricula_turma_disciplina_id === aluno.matricula_turma_disciplina_id); return { ...aluno, aluno_nome: aluno.nome, turma_disciplina_id: id, disciplina_id: turma?.disciplina_id, disciplina_nome: turma?.disciplina_nome, registros: rs.length, presencas: rs.filter((r) => r.status === "PRESENTE").length, faltas: rs.filter((r) => r.status === "AUSENTE").length }; }) };
  }
  private filtrarData(q: Knex.QueryBuilder, f: any, coluna: string) { if (f.dataInicio) q.whereRaw(`(${coluna} AT TIME ZONE 'America/Sao_Paulo')::date >= ?::date`, [f.dataInicio]); if (f.dataFim) q.whereRaw(`(${coluna} AT TIME ZONE 'America/Sao_Paulo')::date <= ?::date`, [f.dataFim]); }
  private dataIso(v: any) { return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10); }
  private auditar(trx: Knex.Transaction, frequenciaId: string, ctx: any, acao: string, antes: any, depois: any) { return trx("frequencia_auditoria").insert({ frequencia_id: frequenciaId, usuario_id: ctx.usuarioId, perfil: ctx.perfil, acao, dados_anteriores: antes ? JSON.stringify(antes) : null, dados_novos: depois ? JSON.stringify(depois) : null }); }
  private baseRegistro(executor: Knex | Knex.Transaction = db) {
    return executor("frequencia").join("aula", "frequencia.aula_id", "aula.id").join("matricula_turma_disciplina as mtd", "frequencia.matricula_turma_disciplina_id", "mtd.id")
      .join("matricula as m", "mtd.matricula_id", "m.id").join("aluno as al", "m.aluno_id", "al.id").join("pessoa as p", "al.pessoa_id", "p.id")
      .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id").join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id").join("disciplinas as d", "cd.disciplina_id", "d.id")
      .select("frequencia.*", "al.id as aluno_id", "p.nome as aluno_nome", "td.id as turma_disciplina_id", "d.id as disciplina_id", "d.nome as disciplina_nome");
  }
}
