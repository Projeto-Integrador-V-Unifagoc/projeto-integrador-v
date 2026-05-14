import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  const hasAulaId = await db.schema.withSchema(SCHEMA).hasColumn("frequencia", "aula_id");

  if (!hasAulaId) {
    await db.schema.withSchema(SCHEMA).alterTable("frequencia", (table) => {
      table.uuid("aula_id").references("id").inTable(`${SCHEMA}.aula`).onDelete("CASCADE");
      table.uuid("aluno_id").references("id").inTable(`${SCHEMA}.aluno`).onDelete("CASCADE");
      table.uuid("turma_id").references("id").inTable(`${SCHEMA}.turma`).onDelete("CASCADE");
      table.text("justificativa");
      table.uuid("responsavel_lancamento_id").references("id").inTable(`${SCHEMA}.professor`).onDelete("SET NULL");
      table.timestamp("criado_em", { useTz: true }).notNullable().defaultTo(db.fn.now());
      table.timestamp("atualizado_em", { useTz: true }).notNullable().defaultTo(db.fn.now());
      table.unique(["aula_id", "aluno_id"], { indexName: "frequencia_aula_aluno_unique" });
      table.index(["turma_id", "data"], "frequencia_turma_data_index");
      table.index(["aluno_id"], "frequencia_aluno_index");
    });
  }
}

export async function down(db: Knex): Promise<void> {
  const hasAulaId = await db.schema.withSchema(SCHEMA).hasColumn("frequencia", "aula_id");

  if (hasAulaId) {
    await db.schema.withSchema(SCHEMA).alterTable("frequencia", (table) => {
      table.dropUnique(["aula_id", "aluno_id"], "frequencia_aula_aluno_unique");
      table.dropIndex(["turma_id", "data"], "frequencia_turma_data_index");
      table.dropIndex(["aluno_id"], "frequencia_aluno_index");
      table.dropColumns("aula_id", "aluno_id", "turma_id", "justificativa", "responsavel_lancamento_id", "criado_em", "atualizado_em");
    });
  }
}
