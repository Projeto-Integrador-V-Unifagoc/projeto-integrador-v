import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('disciplinas', (table) => {
        table.increments('id_disciplina').primary();
        table.string('disciplina_nome').notNullable();
        table.string('disciplina_codigo').unique().notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('disciplinas');
}
