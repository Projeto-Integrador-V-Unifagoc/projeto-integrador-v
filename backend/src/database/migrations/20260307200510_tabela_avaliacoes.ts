import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('avaliacoes', (table) => {
        table.increments('id_avaliacao').primary();
        table.integer('id_disciplina').unsigned().references('id_disciplina').inTable('disciplinas').onDelete('CASCADE');
        table.enum('tipo_avaliacao', ['PROVA', 'TPI', 'TRABALHO']).notNullable();
        table.text('descricao_avaliacao').nullable();
        table.float('valor_avaliacao').notNullable();
        table.date('data_avaliacao').notNullable();
        table.date('data_devolucao_avaliacao').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('avaliacoes');
}
