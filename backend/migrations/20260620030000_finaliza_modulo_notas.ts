import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // 1. Habilita a avaliacao de finalidade RECUPERACAO (0 a 100) sem afetar as regulares.
  await db.raw(`ALTER TABLE ${SCHEMA}.avaliacao DROP CONSTRAINT IF EXISTS avaliacao_tipo_check`);
  await db.raw(`ALTER TABLE ${SCHEMA}.avaliacao DROP CONSTRAINT IF EXISTS avaliacao_valor_tipo_check`);
  await db.raw(`
    ALTER TABLE ${SCHEMA}.avaliacao
      ADD CONSTRAINT avaliacao_tipo_check CHECK (tipo_avaliacao IN ('PROVA', 'TPI', 'TRABALHO', 'RECUPERACAO')),
      ADD CONSTRAINT avaliacao_valor_tipo_check CHECK (
        (tipo_avaliacao = 'PROVA' AND valor = 20) OR
        (tipo_avaliacao = 'TPI' AND valor = 5) OR
        (tipo_avaliacao = 'TRABALHO' AND valor > 0) OR
        (tipo_avaliacao = 'RECUPERACAO' AND valor = 100)
      )
  `);
  // No maximo uma avaliacao de recuperacao por turma_disciplina (RN-09 / secao 5.3).
  await db.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS avaliacao_recuperacao_unica_idx
      ON ${SCHEMA}.avaliacao (turma_disciplina_id)
      WHERE tipo_avaliacao = 'RECUPERACAO'
  `);

  // 2. Tabela propria de notas, separada da definicao da avaliacao (secao 6.2).
  await db.schema.withSchema(SCHEMA).createTable("nota", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("avaliacao_id").notNullable().references("id").inTable(`${SCHEMA}.avaliacao`).onDelete("CASCADE");
    table.uuid("matricula_turma_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.matricula_turma_disciplina`).onDelete("CASCADE");
    table.decimal("valor", 6, 2).notNullable();
    table.timestamp("publicada_em", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.uuid("criada_por_usuario_id").references("id").inTable(`${SCHEMA}.usuario`).onDelete("RESTRICT");
    table.uuid("atualizada_por_usuario_id").references("id").inTable(`${SCHEMA}.usuario`).onDelete("RESTRICT");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.unique(["avaliacao_id", "matricula_turma_disciplina_id"]);
  });
  await db.raw(`ALTER TABLE ${SCHEMA}.nota ADD CONSTRAINT nota_valor_check CHECK (valor >= 0)`);
  await db.raw(`CREATE INDEX nota_avaliacao_idx ON ${SCHEMA}.nota (avaliacao_id)`);
  await db.raw(`CREATE INDEX nota_matricula_idx ON ${SCHEMA}.nota (matricula_turma_disciplina_id)`);
  await db.raw(`CREATE INDEX nota_publicada_idx ON ${SCHEMA}.nota (publicada_em)`);

  // 3. Auditoria de lancamentos e retificacoes (UC-03 / secao 5.7).
  await db.schema.withSchema(SCHEMA).createTable("nota_auditoria", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("nota_id").notNullable().references("id").inTable(`${SCHEMA}.nota`).onDelete("CASCADE");
    table.uuid("usuario_id").notNullable().references("id").inTable(`${SCHEMA}.usuario`).onDelete("RESTRICT");
    table.string("perfil", 20).notNullable();
    table.string("acao", 40).notNullable();
    table.decimal("valor_anterior", 6, 2);
    table.decimal("valor_novo", 6, 2);
    table.text("motivo");
    table.timestamp("criado_em", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["nota_id", "criado_em"]);
  });

  // 4. Autorizacao excepcional da secretaria para edicao fora do prazo (RN-13 / secao 6.4).
  await db.schema.withSchema(SCHEMA).createTable("nota_autorizacao_excepcional", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("avaliacao_id").notNullable().references("id").inTable(`${SCHEMA}.avaliacao`).onDelete("CASCADE");
    table.uuid("matricula_turma_disciplina_id").references("id").inTable(`${SCHEMA}.matricula_turma_disciplina`).onDelete("CASCADE");
    table.text("motivo").notNullable();
    table.uuid("autorizada_por_usuario_id").notNullable().references("id").inTable(`${SCHEMA}.usuario`).onDelete("RESTRICT");
    table.timestamp("expira_em", { useTz: true }).notNullable();
    table.timestamp("utilizada_em", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["avaliacao_id", "expira_em"]);
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).dropTableIfExists("nota_autorizacao_excepcional");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("nota_auditoria");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("nota");
  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.avaliacao_recuperacao_unica_idx`);
  await db.raw(`ALTER TABLE ${SCHEMA}.avaliacao DROP CONSTRAINT IF EXISTS avaliacao_valor_tipo_check`);
  await db.raw(`ALTER TABLE ${SCHEMA}.avaliacao DROP CONSTRAINT IF EXISTS avaliacao_tipo_check`);
  await db.raw(`
    ALTER TABLE ${SCHEMA}.avaliacao
      ADD CONSTRAINT avaliacao_tipo_check CHECK (tipo_avaliacao IN ('PROVA', 'TPI', 'TRABALHO')),
      ADD CONSTRAINT avaliacao_valor_tipo_check CHECK (
        (tipo_avaliacao = 'PROVA' AND valor = 20) OR
        (tipo_avaliacao = 'TPI' AND valor = 5) OR
        (tipo_avaliacao = 'TRABALHO' AND valor > 0)
      )
  `);
}
