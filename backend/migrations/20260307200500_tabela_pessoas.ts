import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('pessoas', (table) => {
        table.string('cpf').primary()
        table.string('nome').notNullable()
        table.timestamp('data_nascimento').notNullable()
        table.string('logradouro').notNullable()
        table.string('numero').notNullable()
        table.string('bairro').notNullable()
        table.string('cidade').notNullable()
        table.string('estado').notNullable()
        table.string('cep').notNullable()
    })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('pessoas')
}
