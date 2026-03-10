import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('usuarios', (table) => {
        table.uuid('id').primary()
        table.string('email').notNullable()
        table.string('tipo_usuario', 50).notNullable()
        table.string('password', 255).notNullable()
        table.timestamp('created_at').notNullable()
        table.timestamp('updated_at')
    })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('usuarios')
}
