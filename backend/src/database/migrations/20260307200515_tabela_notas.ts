import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('notas', (table) => {
        table.increments('id_notas').primary();
        table.integer('id_avaliacao').unsigned().references('id_avaliacao').inTable('avaliacoes').onDelete('CASCADE');
        table.integer('id_disciplina').unsigned().references('id_disciplina').inTable('disciplinas').onDelete('CASCADE');
        table.integer('id_aluno').unsigned().references('id_aluno').inTable('alunos').onDelete('CASCADE');
        table.float('valor_nota').notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('notas');
}
