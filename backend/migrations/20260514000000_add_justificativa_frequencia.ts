import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  const hasJustificativa = await db.schema
    .withSchema(SCHEMA)
    .hasColumn("frequencia", "justificativa");

  if (!hasJustificativa) {
    await db.schema.withSchema(SCHEMA).alterTable("frequencia", (table) => {
      table.text("justificativa");
    });
  }
}

export async function down(db: Knex): Promise<void> {
  const hasJustificativa = await db.schema
    .withSchema(SCHEMA)
    .hasColumn("frequencia", "justificativa");

  if (hasJustificativa) {
    await db.schema.withSchema(SCHEMA).alterTable("frequencia", (table) => {
      table.dropColumn("justificativa");
    });
  }
}
