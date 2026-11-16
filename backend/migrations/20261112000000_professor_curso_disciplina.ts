import type { Knex } from "knex";

const SCHEMA = "piv";

/**
 * O vínculo do professor deixa de ser com a disciplina "solta" e passa a ser com
 * a disciplina dentro de um curso (linha da matriz curricular, `curso_disciplina`).
 * Assim o professor que leciona Algoritmos em ADS não fica habilitado em
 * Algoritmos de SI, e o conteúdo acadêmico (também preso a `curso_disciplina`)
 * usa exatamente o mesmo recorte para a permissão.
 *
 * Backfill: cada vínculo antigo vira vínculo nos cursos em que o professor já
 * responde por uma oferta (`turma_disciplina`) daquela disciplina. Vínculos sem
 * oferta não têm como ser atribuídos a um curso e ficam para a secretaria
 * completar no cadastro do professor.
 *
 * RESTRICT na FK nova preserva a regra anterior: uma disciplina (ou linha da
 * matriz) com professores vinculados não é removida silenciosamente.
 */
export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("professor_disciplina", (table) => {
    table.uuid("curso_disciplina_id").references("id").inTable(`${SCHEMA}.curso_disciplina`).onDelete("RESTRICT");
  });

  // A unique antiga (professor_id, disciplina_id) impediria a mesma disciplina
  // em dois cursos; sai antes do backfill.
  await db.raw(`ALTER TABLE ${SCHEMA}.professor_disciplina DROP CONSTRAINT IF EXISTS professor_disciplina_professor_id_disciplina_id_unique`);

  await db.raw(`
    INSERT INTO ${SCHEMA}.professor_disciplina (professor_id, disciplina_id, curso_disciplina_id)
    SELECT DISTINCT td.professor_id, cd.disciplina_id, cd.id
    FROM ${SCHEMA}.turma_disciplina td
    JOIN ${SCHEMA}.curso_disciplina cd ON cd.id = td.curso_disciplina_id
    WHERE NOT EXISTS (
      SELECT 1 FROM ${SCHEMA}.professor_disciplina pd
      WHERE pd.professor_id = td.professor_id AND pd.curso_disciplina_id = cd.id
    )
  `);

  await db(`${SCHEMA}.professor_disciplina`).whereNull("curso_disciplina_id").del();

  await db.raw(`ALTER TABLE ${SCHEMA}.professor_disciplina DROP CONSTRAINT IF EXISTS professor_disciplina_disciplina_id_foreign`);
  await db.schema.withSchema(SCHEMA).alterTable("professor_disciplina", (table) => {
    table.dropColumn("disciplina_id");
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.professor_disciplina ALTER COLUMN curso_disciplina_id SET NOT NULL`);
  await db.schema.withSchema(SCHEMA).alterTable("professor_disciplina", (table) => {
    table.unique(["professor_id", "curso_disciplina_id"]);
    table.index(["curso_disciplina_id"], "professor_disciplina_curso_disciplina_idx");
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("professor_disciplina", (table) => {
    table.uuid("disciplina_id").references("id").inTable(`${SCHEMA}.disciplinas`).onDelete("RESTRICT");
  });

  await db.raw(`
    UPDATE ${SCHEMA}.professor_disciplina pd
    SET disciplina_id = cd.disciplina_id
    FROM ${SCHEMA}.curso_disciplina cd
    WHERE cd.id = pd.curso_disciplina_id
  `);

  // A mesma disciplina em dois cursos vira um vínculo só.
  await db.raw(`
    DELETE FROM ${SCHEMA}.professor_disciplina a
    USING ${SCHEMA}.professor_disciplina b
    WHERE a.professor_id = b.professor_id
      AND a.disciplina_id = b.disciplina_id
      AND a.id > b.id
  `);

  await db.schema.withSchema(SCHEMA).alterTable("professor_disciplina", (table) => {
    table.dropUnique(["professor_id", "curso_disciplina_id"]);
    table.dropIndex(["curso_disciplina_id"], "professor_disciplina_curso_disciplina_idx");
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.professor_disciplina DROP CONSTRAINT IF EXISTS professor_disciplina_curso_disciplina_id_foreign`);
  await db.schema.withSchema(SCHEMA).alterTable("professor_disciplina", (table) => {
    table.dropColumn("curso_disciplina_id");
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.professor_disciplina ALTER COLUMN disciplina_id SET NOT NULL`);
  await db.schema.withSchema(SCHEMA).alterTable("professor_disciplina", (table) => {
    table.unique(["professor_id", "disciplina_id"]);
  });
}
