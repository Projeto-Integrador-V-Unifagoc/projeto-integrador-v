import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).createTable("calendario_academico_evento", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("periodo_letivo_id").notNullable().references("id").inTable(`${SCHEMA}.periodo_letivo`).onDelete("CASCADE");
    table.string("tipo", 30).notNullable();
    table.string("titulo", 160).notNullable();
    table.text("descricao");
    table.date("data_inicio").notNullable();
    table.date("data_fim").notNullable();
    table.boolean("bloqueia_aulas").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["periodo_letivo_id", "data_inicio", "data_fim"], "calendario_evento_periodo_data_idx");
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.calendario_academico_evento
    ADD CONSTRAINT calendario_evento_tipo_check CHECK (tipo IN ('FERIADO','RECESSO','SUSPENSAO','EVENTO')),
    ADD CONSTRAINT calendario_evento_faixa_check CHECK (data_fim >= data_inicio)`);

  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.aula_chamada_unica_idx`);
  await db.raw(`ALTER TABLE ${SCHEMA}.aula ALTER COLUMN local_id DROP NOT NULL`);
  await db.schema.withSchema(SCHEMA).alterTable("aula", (table) => {
    table.uuid("horario_turma_disciplina_id").references("id").inTable(`${SCHEMA}.horario_turma_disciplina`).onDelete("SET NULL");
    table.time("hora_inicio");
    table.time("hora_fim");
    table.string("local_planejado", 120);
    table.string("origem", 20).notNullable().defaultTo("MANUAL");
    table.string("status", 20).notNullable().defaultTo("PLANEJADA");
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["turma_disciplina_id", "data"], "aula_oferta_data_idx");
  });
  await db.raw(`UPDATE ${SCHEMA}.aula a SET status = CASE WHEN EXISTS (SELECT 1 FROM ${SCHEMA}.frequencia f WHERE f.aula_id = a.id) THEN 'REALIZADA' ELSE 'PLANEJADA' END`);
  await db.raw(`ALTER TABLE ${SCHEMA}.aula
    ADD CONSTRAINT aula_origem_check CHECK (origem IN ('MANUAL','HORARIO')),
    ADD CONSTRAINT aula_status_check CHECK (status IN ('PLANEJADA','REALIZADA','CANCELADA')),
    ADD CONSTRAINT aula_faixa_check CHECK (hora_inicio IS NULL OR hora_fim IS NULL OR hora_fim > hora_inicio)`);
  await db.raw(`CREATE UNIQUE INDEX aula_horario_data_unique ON ${SCHEMA}.aula (horario_turma_disciplina_id, (((data AT TIME ZONE 'America/Sao_Paulo')::date))) WHERE horario_turma_disciplina_id IS NOT NULL`);
}

export async function down(db: Knex): Promise<void> {
  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.aula_horario_data_unique`);
  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.aula_oferta_data_idx`);
  await db.raw(`DELETE FROM ${SCHEMA}.aula WHERE origem = 'HORARIO' AND local_id IS NULL`);
  await db.raw(`ALTER TABLE ${SCHEMA}.aula DROP CONSTRAINT IF EXISTS aula_origem_check, DROP CONSTRAINT IF EXISTS aula_status_check, DROP CONSTRAINT IF EXISTS aula_faixa_check`);
  await db.schema.withSchema(SCHEMA).alterTable("aula", (table) => {
    table.dropColumns("horario_turma_disciplina_id", "hora_inicio", "hora_fim", "local_planejado", "origem", "status", "updated_at");
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.aula ALTER COLUMN local_id SET NOT NULL`);
  await db.raw(`CREATE UNIQUE INDEX aula_chamada_unica_idx ON ${SCHEMA}.aula (turma_disciplina_id, (((data AT TIME ZONE 'America/Sao_Paulo')::date)))`);
  await db.schema.withSchema(SCHEMA).dropTableIfExists("calendario_academico_evento");
}
