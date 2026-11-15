import type { Knex } from "knex";

const SCHEMA = "piv";

/** Configuração única (id = 1) do assistente de suporte: provedor, modelo e a chave cifrada. */
export async function up(db: Knex): Promise<void> {
    if (await db.schema.withSchema(SCHEMA).hasTable("configuracao_ia")) return;

    await db.schema.withSchema(SCHEMA).createTable("configuracao_ia", (t) => {
        t.integer("id").primary().defaultTo(1);
        t.string("provedor", 30).notNullable().defaultTo("anthropic");
        t.string("modelo", 120).notNullable().defaultTo("");
        t.text("api_key_cifrada").notNullable().defaultTo("");
        t.string("api_key_final", 8).notNullable().defaultTo("");
        t.boolean("ativo").notNullable().defaultTo(false);
        t.timestamp("testado_em", { useTz: true }).nullable();
        t.string("resultado_teste", 400).notNullable().defaultTo("");
        t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        t.check("id = 1");
        t.check("provedor in ('anthropic', 'openai', 'google')");
    });

    await db(`${SCHEMA}.configuracao_ia`).insert({ id: 1 });
}

export async function down(db: Knex): Promise<void> {
    await db.schema.withSchema(SCHEMA).dropTableIfExists("configuracao_ia");
}
