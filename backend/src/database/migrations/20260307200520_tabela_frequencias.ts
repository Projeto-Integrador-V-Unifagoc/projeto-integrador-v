import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('frequencias', (table) => {
        table.increments('id_frequencia').primary();
        table.integer('id_aluno').unsigned().references('id_aluno').inTable('alunos').onDelete('CASCADE');
        table.integer('frequencia_valor').notNullable();
        table.boolean('situacao_frequencia').defaultTo(false);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('frequencias');
}
