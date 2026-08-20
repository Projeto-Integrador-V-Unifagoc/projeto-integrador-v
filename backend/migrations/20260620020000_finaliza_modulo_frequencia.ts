import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).alterTable("frequencia", (table) => {
    table.uuid("responsavel_lancamento_usuario_id").references("id").inTable(`${SCHEMA}.usuario`).onDelete("RESTRICT");
    table.uuid("alterada_por_usuario_id").references("id").inTable(`${SCHEMA}.usuario`).onDelete("RESTRICT");
    table.timestamp("lancada_em", { useTz: true });
    table.string("justificativa_motivo", 200);
    table.text("justificativa_observacao");
    table.uuid("justificada_por_usuario_id").references("id").inTable(`${SCHEMA}.usuario`).onDelete("RESTRICT");
    table.string("justificada_por_perfil", 20);
    table.timestamp("justificada_em", { useTz: true });
  });
  await db.raw(`UPDATE ${SCHEMA}.frequencia SET lancada_em = COALESCE(created_at, now()) WHERE lancada_em IS NULL`);
  await db.raw(`ALTER TABLE ${SCHEMA}.frequencia ALTER COLUMN lancada_em SET NOT NULL`);
  await db.raw(`ALTER TABLE ${SCHEMA}.frequencia ADD CONSTRAINT frequencia_status_check CHECK (status IN ('PRESENTE', 'AUSENTE'))`);
  await db.raw(`CREATE UNIQUE INDEX aula_chamada_unica_idx ON ${SCHEMA}.aula (turma_disciplina_id, (((data AT TIME ZONE 'America/Sao_Paulo')::date)))`);
  await db.raw(`CREATE INDEX frequencia_consulta_idx ON ${SCHEMA}.frequencia (matricula_turma_disciplina_id, aula_id, status)`);

  await db.schema.withSchema(SCHEMA).createTable("frequencia_auditoria", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.uuid("frequencia_id").notNullable().references("id").inTable(`${SCHEMA}.frequencia`).onDelete("CASCADE");
    table.uuid("usuario_id").notNullable().references("id").inTable(`${SCHEMA}.usuario`).onDelete("RESTRICT");
    table.string("perfil", 20).notNullable();
    table.string("acao", 40).notNullable();
    table.jsonb("dados_anteriores");
    table.jsonb("dados_novos");
    table.timestamp("criado_em", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["frequencia_id", "criado_em"]);
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).dropTableIfExists("frequencia_auditoria");
  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.frequencia_consulta_idx`);
  await db.raw(`DROP INDEX IF EXISTS ${SCHEMA}.aula_chamada_unica_idx`);
  await db.raw(`ALTER TABLE ${SCHEMA}.frequencia DROP CONSTRAINT IF EXISTS frequencia_status_check`);
  await db.schema.withSchema(SCHEMA).alterTable("frequencia", (table) => {
    table.dropColumns("responsavel_lancamento_usuario_id", "alterada_por_usuario_id", "lancada_em", "justificativa_motivo", "justificativa_observacao", "justificada_por_usuario_id", "justificada_por_perfil", "justificada_em");
  });
}
