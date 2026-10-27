import type { Knex } from "knex";

const SCHEMA = "piv";

/**
 * O relacionamento professor_disciplina entrou antes desta migration e ja foi
 * publicado sem migrar os vinculos existentes. As ofertas de turma preservam
 * a informacao mais precisa disponivel sobre as disciplinas efetivamente
 * lecionadas, por isso sao usadas como fonte para o preenchimento corretivo.
 */
export async function up(db: Knex): Promise<void> {
  await db.raw(`
    INSERT INTO ${SCHEMA}.professor_disciplina (professor_id, disciplina_id)
    SELECT DISTINCT td.professor_id, cd.disciplina_id
    FROM ${SCHEMA}.turma_disciplina AS td
    INNER JOIN ${SCHEMA}.curso_disciplina AS cd
      ON cd.id = td.curso_disciplina_id
    WHERE td.professor_id IS NOT NULL
    ON CONFLICT (professor_id, disciplina_id) DO NOTHING
  `);
}

/**
 * Nao removemos os vinculos no rollback: depois da migracao eles podem ter
 * sido confirmados ou alterados pelo usuario, e nao e possivel distingui-los
 * com seguranca dos registros inseridos automaticamente.
 */
export async function down(_db: Knex): Promise<void> {
  return Promise.resolve();
}
