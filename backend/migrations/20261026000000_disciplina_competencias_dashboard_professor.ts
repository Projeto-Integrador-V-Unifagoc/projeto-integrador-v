import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("disciplinas", (table) => {
    table.string("area_conhecimento", 80);
    table.text("ementa");
    table.integer("carga_horaria_teorica");
    table.integer("carga_horaria_pratica");
    table.integer("carga_horaria_laboratorio");
    table.integer("carga_horaria_extensao");
    table.text("observacoes");
    table.index(["area_conhecimento"], "disciplinas_area_conhecimento_idx");
  });

  await db.raw(`
    ALTER TABLE ${SCHEMA}.disciplinas
      ADD CONSTRAINT disciplinas_cargas_nao_negativas_check CHECK (
        (carga_horaria_teorica IS NULL OR carga_horaria_teorica >= 0) AND
        (carga_horaria_pratica IS NULL OR carga_horaria_pratica >= 0) AND
        (carga_horaria_laboratorio IS NULL OR carga_horaria_laboratorio >= 0) AND
        (carga_horaria_extensao IS NULL OR carga_horaria_extensao >= 0)
      ),
      ADD CONSTRAINT disciplinas_composicao_carga_check CHECK (
        (
          carga_horaria_teorica IS NULL AND
          carga_horaria_pratica IS NULL AND
          carga_horaria_laboratorio IS NULL AND
          carga_horaria_extensao IS NULL
        ) OR (
          carga_horaria_teorica IS NOT NULL AND
          carga_horaria_pratica IS NOT NULL AND
          carga_horaria_laboratorio IS NOT NULL AND
          carga_horaria_extensao IS NOT NULL AND
          carga_horaria_teorica + carga_horaria_pratica +
          carga_horaria_laboratorio + carga_horaria_extensao = carga_horaria
        )
      )
  `);

  await db.schema.withSchema(SCHEMA).createTable("competencia", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.string("codigo", 40).notNullable().unique();
    table.string("nome", 160).notNullable();
    table.text("descricao").notNullable();
    table.string("tipo", 30).notNullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["tipo", "ativo"], "competencia_tipo_ativo_idx");
  });
  await db.raw(`
    ALTER TABLE ${SCHEMA}.competencia
      ADD CONSTRAINT competencia_tipo_check CHECK (tipo IN ('GERAL', 'TECNICA', 'SOCIOEMOCIONAL'))
  `);

  await db.schema.withSchema(SCHEMA).createTable("disciplina_competencia", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.disciplinas`).onDelete("CASCADE");
    table.uuid("competencia_id").notNullable().references("id").inTable(`${SCHEMA}.competencia`).onDelete("RESTRICT");
    table.string("nivel_esperado", 20).notNullable();
    table.boolean("obrigatoria").notNullable().defaultTo(true);
    table.integer("ordem").notNullable().defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.unique(["disciplina_id", "competencia_id"]);
    table.index(["competencia_id"], "disciplina_competencia_competencia_idx");
  });
  await db.raw(`
    ALTER TABLE ${SCHEMA}.disciplina_competencia
      ADD CONSTRAINT disciplina_competencia_nivel_check
        CHECK (nivel_esperado IN ('INTRODUZIR', 'DESENVOLVER', 'CONSOLIDAR')),
      ADD CONSTRAINT disciplina_competencia_ordem_check CHECK (ordem >= 0)
  `);

  await db.schema.withSchema(SCHEMA).alterTable("turma_disciplina", (table) => {
    table.index(["professor_id", "status"], "turma_disciplina_professor_status_idx");
  });
  await db.schema.withSchema(SCHEMA).alterTable("matricula_turma_disciplina", (table) => {
    table.index(["turma_disciplina_id", "status"], "mtd_turma_status_idx");
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("matricula_turma_disciplina", (table) => {
    table.dropIndex(["turma_disciplina_id", "status"], "mtd_turma_status_idx");
  });
  await db.schema.withSchema(SCHEMA).alterTable("turma_disciplina", (table) => {
    table.dropIndex(["professor_id", "status"], "turma_disciplina_professor_status_idx");
  });
  await db.schema.withSchema(SCHEMA).dropTableIfExists("disciplina_competencia");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("competencia");
  await db.raw(`ALTER TABLE ${SCHEMA}.disciplinas DROP CONSTRAINT IF EXISTS disciplinas_composicao_carga_check`);
  await db.raw(`ALTER TABLE ${SCHEMA}.disciplinas DROP CONSTRAINT IF EXISTS disciplinas_cargas_nao_negativas_check`);
  await db.schema.withSchema(SCHEMA).alterTable("disciplinas", (table) => {
    table.dropIndex(["area_conhecimento"], "disciplinas_area_conhecimento_idx");
    table.dropColumns(
      "area_conhecimento",
      "ementa",
      "carga_horaria_teorica",
      "carga_horaria_pratica",
      "carga_horaria_laboratorio",
      "carga_horaria_extensao",
      "observacoes",
    );
  });
}
