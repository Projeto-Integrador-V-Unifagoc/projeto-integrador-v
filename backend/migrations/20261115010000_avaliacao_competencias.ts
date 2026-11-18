import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).createTable("avaliacao_competencia", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("avaliacao_id").notNullable().references("id").inTable(`${SCHEMA}.avaliacao`).onDelete("CASCADE");
    table.uuid("competencia_id").notNullable().references("id").inTable(`${SCHEMA}.competencia`).onDelete("RESTRICT");
    table.decimal("peso_percentual", 5, 2).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.unique(["avaliacao_id", "competencia_id"], { indexName: "avaliacao_competencia_unique" });
    table.index(["competencia_id"], "avaliacao_competencia_competencia_idx");
  });

  await db.raw(`
    ALTER TABLE ${SCHEMA}.avaliacao_competencia
      ADD CONSTRAINT avaliacao_competencia_peso_check
        CHECK (peso_percentual > 0 AND peso_percentual <= 100)
  `);
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).dropTableIfExists("avaliacao_competencia");
}
