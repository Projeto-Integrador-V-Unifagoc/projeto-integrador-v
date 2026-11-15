import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).createTable("horario_turma_disciplina", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("turma_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.turma_disciplina`).onDelete("CASCADE");
    table.smallint("dia_semana").notNullable();
    table.time("hora_inicio").notNullable();
    table.time("hora_fim").notNullable();
    table.string("local", 120);
    table.date("vigencia_inicio").notNullable();
    table.date("vigencia_fim").notNullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["turma_disciplina_id", "dia_semana"], "horario_oferta_dia_idx");
    table.index(["dia_semana", "hora_inicio", "hora_fim"], "horario_faixa_idx");
  });
  await db.raw(`
    ALTER TABLE ${SCHEMA}.horario_turma_disciplina
      ADD CONSTRAINT horario_dia_semana_check CHECK (dia_semana BETWEEN 1 AND 7),
      ADD CONSTRAINT horario_faixa_check CHECK (hora_fim > hora_inicio),
      ADD CONSTRAINT horario_vigencia_check CHECK (vigencia_fim >= vigencia_inicio)
  `);
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).dropTableIfExists("horario_turma_disciplina");
}
