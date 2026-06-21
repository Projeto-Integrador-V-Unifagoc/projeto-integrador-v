import type { Knex } from 'knex';

const SCHEMA = 'piv';

export async function up(db: Knex): Promise<void> {
  await db.raw(`ALTER TABLE ${SCHEMA}.professor ALTER COLUMN usuario_id DROP NOT NULL`);
  await db.raw(`ALTER TABLE ${SCHEMA}.professor DROP CONSTRAINT IF EXISTS professor_usuario_id_foreign`);
  await db.raw(`ALTER TABLE ${SCHEMA}.professor ADD CONSTRAINT professor_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES ${SCHEMA}.usuario(id) ON DELETE SET NULL`);
  await db.schema.withSchema(SCHEMA).alterTable('professor', (table) => {
    table.boolean('ativo').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(['ativo'], 'professor_ativo_idx');
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable('professor', (table) => {
    table.dropIndex(['ativo'], 'professor_ativo_idx');
    table.dropColumns('ativo', 'created_at', 'updated_at');
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.professor DROP CONSTRAINT IF EXISTS professor_usuario_id_foreign`);
  await db.raw(`ALTER TABLE ${SCHEMA}.professor ADD CONSTRAINT professor_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES ${SCHEMA}.usuario(id) ON DELETE CASCADE`);
  await db.raw(`ALTER TABLE ${SCHEMA}.professor ALTER COLUMN usuario_id SET NOT NULL`);
}
