import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('aprovacoes', (table) => {
        table.increments('id_aprovacao').primary();
        table.integer('id_frequencia').unsigned().references('id_frequencia').inTable('frequencias').onDelete('CASCADE');
        table.integer('id_nota_final').unsigned().references('id_nota_final').inTable('notas_finais').onDelete('CASCADE');
        table.integer('id_aluno').unsigned().references('id_aluno').inTable('alunos').onDelete('CASCADE');
        table.integer('id_disciplina').unsigned().references('id_disciplina').inTable('disciplinas').onDelete('CASCADE');
        table.boolean('status_aprovacao').defaultTo(false);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('aprovacoes');
}
