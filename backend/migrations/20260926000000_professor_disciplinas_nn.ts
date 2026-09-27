import type { Knex } from "knex";

const SCHEMA = "piv";

const uuidPrimary = (table: Knex.CreateTableBuilder, db: Knex) => {
  table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
};

const addTimestamps = (table: Knex.CreateTableBuilder, db: Knex) => {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
};

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).createTable("professor_disciplina", (table) => {
    uuidPrimary(table, db);
    table.uuid("professor_id").notNullable().references("id").inTable(`${SCHEMA}.professor`).onDelete("CASCADE");
    table.uuid("disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.disciplinas`).onDelete("RESTRICT");
    addTimestamps(table, db);
    table.unique(["professor_id", "disciplina_id"]);
  });

  await db.raw(`ALTER TABLE ${SCHEMA}.professor DROP CONSTRAINT IF EXISTS professor_curso_id_foreign`);
  await db.schema.withSchema(SCHEMA).alterTable("professor", (table) => {
    table.dropColumn("curso_id");
  });

  // faculdade_id deixa de ser derivada automaticamente de um curso único do
  // professor; passa a ser escolhida manualmente (com sugestão no frontend),
  // por isso deixa de ser obrigatória.
  await db.raw(`ALTER TABLE ${SCHEMA}.professor ALTER COLUMN faculdade_id DROP NOT NULL`);
}

export async function down(db: Knex): Promise<void> {
  await db.raw(`ALTER TABLE ${SCHEMA}.professor ALTER COLUMN faculdade_id SET NOT NULL`);

  // curso_id volta nullable: não há como recuperar os valores originais,
  // já que a coluna foi removida em up() sem guardar histórico.
  await db.schema.withSchema(SCHEMA).alterTable("professor", (table) => {
    table.uuid("curso_id").references("id").inTable(`${SCHEMA}.curso`).onDelete("RESTRICT");
  });

  await db.schema.withSchema(SCHEMA).dropTableIfExists("professor_disciplina");
}
