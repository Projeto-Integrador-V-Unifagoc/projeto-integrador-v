import type { Knex } from "knex"

const SCHEMA = "piv"

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("cidade", (table) => {
    table.string("ibge").unique().notNullable()
  })
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("cidade", (table) => {
    table.dropColumn("ibge")
  })
}