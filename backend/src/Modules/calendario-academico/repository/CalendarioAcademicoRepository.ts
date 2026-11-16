import type { Knex } from "knex";
import { db } from "../../../database/connection";
import type { EventoAcademicoCommand, OcorrenciaAulaPlanejada } from "../models/CalendarioAcademico";

export class CalendarioAcademicoRepository {
  buscarPeriodo(id: string) { return db("periodo_letivo").where({ id }).first(); }
  listarEventos(periodoId: string) { return db("calendario_academico_evento").where({ periodo_letivo_id: periodoId }).orderBy("data_inicio").orderBy("titulo"); }
  buscarEvento(id: string) { return db("calendario_academico_evento").where({ id }).first(); }
  async criarEvento(data: EventoAcademicoCommand) { return (await db("calendario_academico_evento").insert(data).returning("*"))[0]; }
  async atualizarEvento(id: string, data: Partial<EventoAcademicoCommand>) { return (await db("calendario_academico_evento").where({ id }).update({ ...data, updated_at: db.fn.now() }).returning("*"))[0] ?? null; }
  removerEvento(id: string) { return db("calendario_academico_evento").where({ id }).del(); }

  listarHorarios(periodoId: string) {
    return db("horario_turma_disciplina as h")
      .join("turma_disciplina as td", "h.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .where("t.periodo_letivo_id", periodoId)
      .where("h.ativo", true)
      .select("h.*", "td.professor_id");
  }

  listarAulasGeradas(
    periodoId: string,
    intervalo?: { inicio: string; fim: string },
    executor: Knex | Knex.Transaction = db,
  ) {
    const query = executor("aula as a")
      .join("turma_disciplina as td", "a.turma_disciplina_id", "td.id")
      .join("turma as t", "td.turma_id", "t.id")
      .leftJoin("frequencia as f", "f.aula_id", "a.id")
      .where("t.periodo_letivo_id", periodoId)
      .where("a.origem", "HORARIO")
      .select("a.*")
      .count({ frequencias: "f.id" })
      .groupBy("a.id");
    if (intervalo) {
      query.whereRaw(
        "(a.data AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN ?::date AND ?::date",
        [intervalo.inicio, intervalo.fim],
      );
    }
    return query;
  }

  async sincronizarAulas(
    periodoId: string,
    ocorrencias: OcorrenciaAulaPlanejada[],
    intervalo: { inicio: string; fim: string },
  ) {
    return db.transaction(async (trx) => {
      await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?))", [`calendario:${periodoId}`]);
      const existentes = await this.listarAulasGeradas(periodoId, intervalo, trx);
      const porChave = new Map(existentes.map((a: any) => [`${a.horario_turma_disciplina_id}:${this.dataIso(a.data)}`, a]));
      const chavesValidas = new Set(ocorrencias.map((item) => `${item.horarioId}:${item.data}`));
      const locais = await trx("local").select("id", "codigo");
      const localPorCodigo = new Map(locais.map((item: any) => [String(item.codigo).trim().toLowerCase(), item.id]));
      let criadas = 0; let reativadas = 0; let canceladas = 0; let preservadasComChamada = 0;

      for (const aula of existentes as any[]) {
        const chave = `${aula.horario_turma_disciplina_id}:${this.dataIso(aula.data)}`;
        if (chavesValidas.has(chave)) continue;
        if (Number(aula.frequencias) > 0 || aula.status === "REALIZADA") { preservadasComChamada += 1; continue; }
        if (aula.status !== "CANCELADA") {
          await trx("aula").where({ id: aula.id }).update({ status: "CANCELADA", updated_at: trx.fn.now() });
          canceladas += 1;
        }
      }

      for (const item of ocorrencias) {
        const chave = `${item.horarioId}:${item.data}`;
        const existente: any = porChave.get(chave);
        const localId = item.local ? localPorCodigo.get(item.local.trim().toLowerCase()) ?? null : null;
        const dados = {
          turma_disciplina_id: item.turmaDisciplinaId,
          professor_id: item.professorId,
          local_id: localId,
          data: `${item.data}T${item.horaInicio}:00-03:00`,
          horario_turma_disciplina_id: item.horarioId,
          hora_inicio: item.horaInicio,
          hora_fim: item.horaFim,
          local_planejado: item.local,
          origem: "HORARIO",
          updated_at: trx.fn.now(),
        };
        if (existente) {
          const status = existente.status === "CANCELADA" ? "PLANEJADA" : existente.status;
          await trx("aula").where({ id: existente.id }).update({ ...dados, status });
          if (existente.status === "CANCELADA") reativadas += 1;
        } else {
          const inseridas = await trx("aula").insert({ ...dados, status: "PLANEJADA" }).onConflict().ignore().returning("id");
          criadas += inseridas.length;
        }
      }
      return { criadas, reativadas, canceladas, preservadasComChamada };
    });
  }

  private dataIso(valor: unknown) {
    if (!(valor instanceof Date)) return String(valor).slice(0, 10);
    const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(valor);
    const obter = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? "";
    return `${obter("year")}-${obter("month")}-${obter("day")}`;
  }
}
