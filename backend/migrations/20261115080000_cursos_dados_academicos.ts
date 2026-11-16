import type { Knex } from "knex";
const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("curso", (table) => {
    table.text("descricao"); table.string("grau_academico", 30); table.string("modalidade", 20);
    table.integer("duracao_periodos"); table.integer("carga_horaria_minima");
    table.string("situacao_academica", 20).notNullable().defaultTo("ATIVO");
    table.string("ato_regulatorio", 160); table.text("observacoes_regulatorias");
    table.index(["situacao_academica", "modalidade"], "curso_situacao_modalidade_idx");
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.curso
    ADD CONSTRAINT curso_grau_check CHECK (grau_academico IS NULL OR grau_academico IN ('BACHARELADO','LICENCIATURA','TECNOLOGO','SEQUENCIAL','POS_GRADUACAO')),
    ADD CONSTRAINT curso_modalidade_check CHECK (modalidade IS NULL OR modalidade IN ('PRESENCIAL','HIBRIDO','EAD')),
    ADD CONSTRAINT curso_situacao_check CHECK (situacao_academica IN ('ATIVO','INATIVO','EM_EXTINCAO')),
    ADD CONSTRAINT curso_duracao_check CHECK (duracao_periodos IS NULL OR duracao_periodos BETWEEN 1 AND 30),
    ADD CONSTRAINT curso_carga_minima_check CHECK (carga_horaria_minima IS NULL OR carga_horaria_minima > 0)`);
}
export async function down(db: Knex): Promise<void> {
  await db.raw(`ALTER TABLE ${SCHEMA}.curso DROP CONSTRAINT IF EXISTS curso_grau_check, DROP CONSTRAINT IF EXISTS curso_modalidade_check, DROP CONSTRAINT IF EXISTS curso_situacao_check, DROP CONSTRAINT IF EXISTS curso_duracao_check, DROP CONSTRAINT IF EXISTS curso_carga_minima_check`);
  await db.schema.withSchema(SCHEMA).alterTable("curso", (table) => { table.dropIndex(["situacao_academica", "modalidade"], "curso_situacao_modalidade_idx"); table.dropColumns("descricao", "grau_academico", "modalidade", "duracao_periodos", "carga_horaria_minima", "situacao_academica", "ato_regulatorio", "observacoes_regulatorias"); });
}
