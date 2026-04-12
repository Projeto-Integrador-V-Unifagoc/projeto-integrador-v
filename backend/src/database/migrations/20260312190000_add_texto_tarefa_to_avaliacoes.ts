import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasColumn("avaliacoes", "texto_tarefa");

  if (!exists) {
    await knex.schema.alterTable("avaliacoes", (table) => {
      table.text("texto_tarefa").nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasColumn("avaliacoes", "texto_tarefa");

  if (exists) {
    await knex.schema.alterTable("avaliacoes", (table) => {
      table.dropColumn("texto_tarefa");
    });
  }
}
