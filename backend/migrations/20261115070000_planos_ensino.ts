import type { Knex } from "knex";
const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).createTable("plano_ensino", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("turma_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.turma_disciplina`).onDelete("CASCADE");
    table.integer("versao").notNullable();
    table.string("status", 20).notNullable().defaultTo("RASCUNHO");
    table.uuid("responsavel_professor_id").notNullable().references("id").inTable(`${SCHEMA}.professor`).onDelete("RESTRICT");
    table.jsonb("conteudo").notNullable().defaultTo("{}");
    table.text("snapshot_ementa");
    table.jsonb("snapshot_competencias");
    table.timestamp("submetido_em", { useTz: true });
    table.timestamp("aprovado_em", { useTz: true });
    table.timestamp("arquivado_em", { useTz: true });
    table.uuid("aprovado_por_usuario_id").references("id").inTable(`${SCHEMA}.usuario`).onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.unique(["turma_disciplina_id", "versao"], { indexName: "plano_ensino_oferta_versao_unique" });
    table.index(["turma_disciplina_id", "status"], "plano_ensino_oferta_status_idx");
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.plano_ensino ADD CONSTRAINT plano_ensino_status_check CHECK (status IN ('RASCUNHO','SUBMETIDO','APROVADO','ARQUIVADO')), ADD CONSTRAINT plano_ensino_versao_check CHECK (versao > 0)`);
  await db.raw(`CREATE UNIQUE INDEX plano_ensino_aprovado_por_oferta_unique ON ${SCHEMA}.plano_ensino (turma_disciplina_id) WHERE status = 'APROVADO'`);
}

export async function down(db: Knex): Promise<void> {
  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.plano_ensino_aprovado_por_oferta_unique`);
  await db.schema.withSchema(SCHEMA).dropTableIfExists("plano_ensino");
}

