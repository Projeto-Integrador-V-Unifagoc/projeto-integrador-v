import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
    await db.schema.withSchema(SCHEMA).createTable("documento", (table) => {
        table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
        table.uuid("aluno_id").notNullable().references("id").inTable(`${SCHEMA}.aluno`).onDelete("CASCADE");
        table.string("tipo_documento").notNullable();
        table.string("nome_arquivo").notNullable();
        table.string("caminho_arquivo").notNullable();
        table.string("status").notNullable().defaultTo("PENDENTE");
        table.text("observacao").nullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    });
}

export async function down(db: Knex): Promise<void> {
    await db.schema.withSchema(SCHEMA).dropTableIfExists("documento");
}
