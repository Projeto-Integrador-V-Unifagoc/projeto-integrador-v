import type { Knex } from 'knex';

const SCHEMA = 'piv';
const TABELA = 'recuperacao_senha';

export async function up(db: Knex): Promise<void> {
  await db.schema
    .withSchema(SCHEMA)
    .createTable(TABELA, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(db.raw('gen_random_uuid()'));

      table
        .uuid('usuario_id')
        .notNullable()
        .references('id')
        .inTable(`${SCHEMA}.usuario`)
        .onDelete('CASCADE');

      table.string('token_hash', 64).notNullable().unique();

      table
        .timestamp('expires_at', { useTz: true })
        .notNullable();

      table
        .timestamp('used_at', { useTz: true })
        .nullable();

      table
        .timestamp('created_at', { useTz: true })
        .notNullable()
        .defaultTo(db.fn.now());

      table.index(
        ['usuario_id'],
        'recuperacao_senha_usuario_id_idx'
      );

      table.index(
        ['expires_at'],
        'recuperacao_senha_expires_at_idx'
      );
    });
}

export async function down(db: Knex): Promise<void> {
  await db.schema
    .withSchema(SCHEMA)
    .dropTableIfExists(TABELA);
}