import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).createTable("curso_disciplina_requisito", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("curso_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.curso_disciplina`).onDelete("CASCADE");
    table.uuid("requisito_curso_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.curso_disciplina`).onDelete("CASCADE");
    table.string("tipo", 20).notNullable().defaultTo("OBRIGATORIO");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.unique(["curso_disciplina_id", "requisito_curso_disciplina_id"], { indexName: "curso_disciplina_requisito_unique" });
    table.index(["requisito_curso_disciplina_id"], "curso_disciplina_requisito_inverso_idx");
  });
  await db.raw(`
    ALTER TABLE ${SCHEMA}.curso_disciplina_requisito
      ADD CONSTRAINT curso_disciplina_requisito_tipo_check
        CHECK (tipo IN ('OBRIGATORIO', 'RECOMENDADO')),
      ADD CONSTRAINT curso_disciplina_requisito_autorreferencia_check
        CHECK (curso_disciplina_id <> requisito_curso_disciplina_id)
  `);
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).dropTableIfExists("curso_disciplina_requisito");
}

