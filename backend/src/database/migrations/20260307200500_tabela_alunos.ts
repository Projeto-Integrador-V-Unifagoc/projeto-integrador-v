import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('alunos', (table) => {
        table.increments('id_aluno').primary();
        table.string('aluno_nome').notNullable();
        table.string('aluno_email').unique().notNullable();
        table.string('aluno_matricula').unique().notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('alunos');
}
