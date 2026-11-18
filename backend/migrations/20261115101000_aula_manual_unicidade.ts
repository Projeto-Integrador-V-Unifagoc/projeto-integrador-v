import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.raw(`CREATE UNIQUE INDEX aula_manual_data_unique
    ON ${SCHEMA}.aula (turma_disciplina_id, (((data AT TIME ZONE 'America/Sao_Paulo')::date)))
    WHERE horario_turma_disciplina_id IS NULL`);
}

export async function down(db: Knex): Promise<void> {
  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.aula_manual_data_unique`);
}
