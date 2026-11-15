import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).createTable("matriz_curricular", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("curso_id").notNullable().references("id").inTable(`${SCHEMA}.curso`).onDelete("CASCADE");
    table.string("codigo", 60).notNullable();
    table.string("versao", 60).notNullable();
    table.string("status", 20).notNullable().defaultTo("RASCUNHO");
    table.date("vigencia_inicio").notNullable();
    table.date("vigencia_fim");
    table.timestamp("publicada_em", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.unique(["curso_id", "codigo"], { indexName: "matriz_curricular_curso_codigo_unique" });
  });

  await db.raw(`
    ALTER TABLE ${SCHEMA}.matriz_curricular
      ADD CONSTRAINT matriz_curricular_status_check
        CHECK (status IN ('RASCUNHO', 'VIGENTE', 'ENCERRADA')),
      ADD CONSTRAINT matriz_curricular_vigencia_check
        CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
  `);
  await db.raw(`
    CREATE UNIQUE INDEX matriz_curricular_vigente_por_curso_unique
      ON ${SCHEMA}.matriz_curricular (curso_id)
      WHERE status = 'VIGENTE'
  `);

  await db.schema.withSchema(SCHEMA).alterTable("curso_disciplina", (table) => {
    table.uuid("matriz_curricular_id").references("id").inTable(`${SCHEMA}.matriz_curricular`).onDelete("CASCADE");
  });
  await db.schema.withSchema(SCHEMA).alterTable("turma", (table) => {
    table.uuid("matriz_curricular_id").references("id").inTable(`${SCHEMA}.matriz_curricular`).onDelete("RESTRICT");
  });

  await db.raw(`
    INSERT INTO ${SCHEMA}.matriz_curricular
      (id, curso_id, codigo, versao, status, vigencia_inicio, publicada_em)
    SELECT
      gen_random_uuid(), c.id, 'LEGADO', 'Matriz migrada', 'VIGENTE',
      COALESCE((
        SELECT MIN(pl.data_inicio)
          FROM ${SCHEMA}.turma t
          JOIN ${SCHEMA}.periodo_letivo pl ON pl.id = t.periodo_letivo_id
         WHERE t.curso_id = c.id
      ), CURRENT_DATE),
      NOW()
    FROM ${SCHEMA}.curso c
  `);
  await db.raw(`
    UPDATE ${SCHEMA}.curso_disciplina cd
       SET matriz_curricular_id = mc.id
      FROM ${SCHEMA}.matriz_curricular mc
     WHERE mc.curso_id = cd.curso_id AND mc.codigo = 'LEGADO'
  `);
  await db.raw(`
    UPDATE ${SCHEMA}.turma t
       SET matriz_curricular_id = mc.id
      FROM ${SCHEMA}.matriz_curricular mc
     WHERE mc.curso_id = t.curso_id AND mc.codigo = 'LEGADO'
  `);

  await db.schema.withSchema(SCHEMA).alterTable("curso_disciplina", (table) => {
    table.dropUnique(["curso_id", "disciplina_id"]);
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.curso_disciplina ALTER COLUMN matriz_curricular_id SET NOT NULL`);
  await db.raw(`ALTER TABLE ${SCHEMA}.turma ALTER COLUMN matriz_curricular_id SET NOT NULL`);
  await db.schema.withSchema(SCHEMA).alterTable("curso_disciplina", (table) => {
    table.unique(["matriz_curricular_id", "disciplina_id"], { indexName: "curso_disciplina_matriz_disciplina_unique" });
    table.index(["curso_id", "matriz_curricular_id"], "curso_disciplina_curso_matriz_idx");
  });
  await db.schema.withSchema(SCHEMA).alterTable("turma", (table) => {
    table.index(["matriz_curricular_id"], "turma_matriz_curricular_idx");
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("curso_disciplina", (table) => {
    table.dropIndex(["curso_id", "matriz_curricular_id"], "curso_disciplina_curso_matriz_idx");
    table.dropUnique(["matriz_curricular_id", "disciplina_id"], "curso_disciplina_matriz_disciplina_unique");
    table.dropColumn("matriz_curricular_id");
    table.unique(["curso_id", "disciplina_id"]);
  });
  await db.schema.withSchema(SCHEMA).alterTable("turma", (table) => {
    table.dropIndex(["matriz_curricular_id"], "turma_matriz_curricular_idx");
    table.dropColumn("matriz_curricular_id");
  });
  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.matriz_curricular_vigente_por_curso_unique`);
  await db.schema.withSchema(SCHEMA).dropTableIfExists("matriz_curricular");
}
