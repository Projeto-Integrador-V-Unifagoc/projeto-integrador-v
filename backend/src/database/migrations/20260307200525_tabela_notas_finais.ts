import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('notas_finais', (table) => {
        table.increments('id_nota_final').primary();
        table.integer('id_disciplina').unsigned().references('id_disciplina').inTable('disciplinas').onDelete('CASCADE');
        table.integer('id_aluno').unsigned().references('id_aluno').inTable('alunos').onDelete('CASCADE');
        table.float('nota_final_valor').notNullable();
        table.boolean('situacao_nota_final').defaultTo(false);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('notas_finais');
}
