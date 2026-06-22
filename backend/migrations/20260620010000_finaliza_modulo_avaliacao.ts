import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.raw(`
    UPDATE ${SCHEMA}.avaliacao
    SET tipo_avaliacao = CASE
      WHEN UPPER(tipo_avaliacao) LIKE 'PROVA%' THEN 'PROVA'
      WHEN UPPER(tipo_avaliacao) LIKE 'TPI%' THEN 'TPI'
      WHEN UPPER(tipo_avaliacao) LIKE 'TRABALHO%' THEN 'TRABALHO'
      ELSE 'TRABALHO'
    END
  `);

  await db.raw(`
    UPDATE ${SCHEMA}.avaliacao
    SET
      valor = CASE
        WHEN tipo_avaliacao = 'PROVA' THEN 20
        WHEN tipo_avaliacao = 'TPI' THEN 5
        WHEN valor IS NULL OR valor <= 0 THEN 1
        ELSE valor
      END,
      data_devolucao = CASE
        WHEN data_devolucao IS NOT NULL AND data_devolucao < data_lancamento::date
          THEN data_lancamento::date
        ELSE data_devolucao
      END
  `);

  await db.schema.withSchema(SCHEMA).alterTable("avaliacao", (table) => {
    table.index(["turma_disciplina_id"], "avaliacao_turma_disciplina_idx");
    table.index(["data_lancamento"], "avaliacao_data_lancamento_idx");
  });
  await db.raw(`
    ALTER TABLE ${SCHEMA}.avaliacao
      ALTER COLUMN valor SET NOT NULL,
      ADD CONSTRAINT avaliacao_tipo_check CHECK (tipo_avaliacao IN ('PROVA', 'TPI', 'TRABALHO')),
      ADD CONSTRAINT avaliacao_valor_check CHECK (valor > 0),
      ADD CONSTRAINT avaliacao_datas_check CHECK (data_devolucao IS NULL OR data_devolucao >= data_lancamento::date),
      ADD CONSTRAINT avaliacao_valor_tipo_check CHECK (
        (tipo_avaliacao = 'PROVA' AND valor = 20) OR
        (tipo_avaliacao = 'TPI' AND valor = 5) OR
        (tipo_avaliacao = 'TRABALHO' AND valor > 0)
      )
  `);
}

export async function down(db: Knex): Promise<void> {
  await db.raw(`
    ALTER TABLE ${SCHEMA}.avaliacao
      DROP CONSTRAINT IF EXISTS avaliacao_valor_tipo_check,
      DROP CONSTRAINT IF EXISTS avaliacao_datas_check,
      DROP CONSTRAINT IF EXISTS avaliacao_valor_check,
      DROP CONSTRAINT IF EXISTS avaliacao_tipo_check,
      ALTER COLUMN valor DROP NOT NULL
  `);
  await db.schema.withSchema(SCHEMA).alterTable("avaliacao", (table) => {
    table.dropIndex(["turma_disciplina_id"], "avaliacao_turma_disciplina_idx");
    table.dropIndex(["data_lancamento"], "avaliacao_data_lancamento_idx");
  });
}
