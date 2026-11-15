import type { Knex } from "knex";
import { db } from "../../../database/connection";
import type { HorarioOfertaCommand } from "../models/HorarioOferta";

export class HorarioOfertaRepository {
  private baseQuery(conexao: Knex | Knex.Transaction = db) {
    return conexao("horario_turma_disciplina as h")
      .join("turma_disciplina as td", "h.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .join("professor as prof", "td.professor_id", "prof.id")
      .join("pessoa as p", "prof.pessoa_id", "p.id")
      .select(
        "h.*", "td.turma_id", "td.professor_id", "t.sigla as turma_sigla", "t.descricao as turma_descricao",
        "d.codigo as disciplina_codigo", "d.nome as disciplina_nome", "p.nome as professor_nome",
        "pl.codigo as periodo_codigo", "pl.data_inicio as periodo_inicio", "pl.data_fim as periodo_fim",
      );
  }

  listarPorTurma(turmaId: string) {
    return this.baseQuery().where("td.turma_id", turmaId).orderBy("h.dia_semana").orderBy("h.hora_inicio");
  }
  listarPorOferta(ofertaId: string) {
    return this.baseQuery().where("h.turma_disciplina_id", ofertaId).orderBy("h.dia_semana").orderBy("h.hora_inicio");
  }
  buscarPorId(id: string) { return this.baseQuery().where("h.id", id).first(); }

  async criar(data: HorarioOfertaCommand) {
    return db.transaction(async (trx) => {
      await trx.raw("SELECT pg_advisory_xact_lock(?)", [data.dia_semana]);
      const contexto = await this.contextoOferta(trx, data.turma_disciplina_id);
      this.validarPeriodo(contexto, data);
      await this.validarConflitos(trx, contexto, data);
      return (await trx("horario_turma_disciplina").insert(data).returning("*"))[0];
    });
  }

  async atualizar(id: string, data: HorarioOfertaCommand) {
    return db.transaction(async (trx) => {
      await trx.raw("SELECT pg_advisory_xact_lock(?)", [data.dia_semana]);
      const existente = await trx("horario_turma_disciplina").where({ id }).forUpdate().first();
      if (!existente) return null;
      const contexto = await this.contextoOferta(trx, data.turma_disciplina_id);
      this.validarPeriodo(contexto, data);
      await this.validarConflitos(trx, contexto, data, id);
      return (await trx("horario_turma_disciplina").where({ id }).update({ ...data, updated_at: trx.fn.now() }).returning("*"))[0];
    });
  }

  remover(id: string) { return db("horario_turma_disciplina").where({ id }).del(); }

  private contextoOferta(trx: Knex.Transaction, ofertaId: string) {
    return trx("turma_disciplina as td")
      .join("turma as t", "td.turma_id", "t.id")
      .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .where("td.id", ofertaId)
      .select("td.id", "td.turma_id", "td.professor_id", "pl.data_inicio as periodo_inicio", "pl.data_fim as periodo_fim")
      .first()
      .then((item) => {
        if (!item) throw Object.assign(new Error("Oferta de disciplina nao encontrada"), { status: 404 });
        return item;
      });
  }

  private validarPeriodo(contexto: any, data: HorarioOfertaCommand) {
    const inicioPeriodo = this.dataIso(contexto.periodo_inicio);
    const fimPeriodo = this.dataIso(contexto.periodo_fim);
    if (data.vigencia_inicio < inicioPeriodo || data.vigencia_fim > fimPeriodo) {
      throw Object.assign(new Error(`A vigencia do horario deve ficar entre ${inicioPeriodo} e ${fimPeriodo}`), { status: 400 });
    }
  }

  private async validarConflitos(trx: Knex.Transaction, contexto: any, data: HorarioOfertaCommand, ignorarId?: string) {
    const query = trx("horario_turma_disciplina as h")
      .join("turma_disciplina as td", "h.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("disciplinas as d", "cd.disciplina_id", "d.id")
      .where("h.ativo", true)
      .where("h.dia_semana", data.dia_semana)
      .whereRaw("h.hora_inicio < ?::time AND h.hora_fim > ?::time", [data.hora_fim, data.hora_inicio])
      .whereRaw("daterange(h.vigencia_inicio, h.vigencia_fim, '[]') && daterange(?::date, ?::date, '[]')", [data.vigencia_inicio, data.vigencia_fim])
      .where((builder) => {
        builder.where("td.turma_id", contexto.turma_id).orWhere("td.professor_id", contexto.professor_id);
        if (data.local) builder.orWhereRaw("lower(trim(h.local)) = lower(trim(?))", [data.local]);
      })
      .select("h.id", "h.local", "td.turma_id", "td.professor_id", "t.sigla as turma_sigla", "d.nome as disciplina_nome")
      .first();
    if (ignorarId) query.whereNot("h.id", ignorarId);
    const conflito = await query;
    if (!conflito) return;
    const motivos: string[] = [];
    if (String(conflito.turma_id) === String(contexto.turma_id)) motivos.push("a turma");
    if (String(conflito.professor_id) === String(contexto.professor_id)) motivos.push("o professor");
    if (data.local && String(conflito.local ?? "").trim().toLowerCase() === data.local.toLowerCase()) motivos.push("o local");
    throw Object.assign(new Error(`Conflito de horario para ${motivos.join(", ")} com ${conflito.disciplina_nome} (${conflito.turma_sigla})`), { status: 409, conflito });
  }

  private dataIso(valor: unknown) {
    if (valor instanceof Date) return valor.toISOString().slice(0, 10);
    return String(valor).slice(0, 10);
  }
}
