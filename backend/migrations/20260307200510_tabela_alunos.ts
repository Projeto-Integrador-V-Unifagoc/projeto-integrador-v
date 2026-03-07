import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('alunos', (table) => {
        table.string('matricula').primary()
        table.uuid('usuario_id').references('id').inTable('usuarios').notNullable()
        table.string('pessoa_id').references('cpf').inTable('pessoas').notNullable()
        //table.uuid('curso_id').references('id').inTable('cursos').notNullable()
        table.string('periodo').notNullable()
    })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('alunos')
}

