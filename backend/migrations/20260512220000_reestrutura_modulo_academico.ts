import type { Knex } from "knex";

const SCHEMA = "piv";

const uuidPrimary = (table: Knex.CreateTableBuilder, db: Knex) => {
  table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
};

const addTimestamps = (table: Knex.CreateTableBuilder, db: Knex) => {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
};

const dropAcademicTables = async (db: Knex) => {
  await db.schema.withSchema(SCHEMA).dropTableIfExists("matricula_documento");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("avaliacao");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("aluno_turma");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("frequencia");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("aula");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("matricula_turma_disciplina");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("matricula");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("turma_disciplina");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("turma");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("curso_disciplina");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("periodo_letivo");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("disciplinas");
};

const createAcademicTables = async (db: Knex) => {
  await db.schema.withSchema(SCHEMA).createTable("disciplinas", (table) => {
    uuidPrimary(table, db);
    table.string("codigo").notNullable().unique();
    table.string("nome").notNullable();
    table.string("pre_requisito");
    table.integer("carga_horaria").notNullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    addTimestamps(table, db);
  });

  await db.schema.withSchema(SCHEMA).createTable("periodo_letivo", (table) => {
    uuidPrimary(table, db);
    table.string("codigo").notNullable().unique();
    table.integer("ano").notNullable();
    table.integer("semestre").notNullable();
    table.date("data_inicio").notNullable();
    table.date("data_fim").notNullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    table.string("status").notNullable().defaultTo("planejado");
    addTimestamps(table, db);
    table.unique(["ano", "semestre"]);
  });

  await db.raw(`
    ALTER TABLE ${SCHEMA}.periodo_letivo
    ADD CONSTRAINT periodo_letivo_semestre_check CHECK (semestre IN (1, 2))
  `);
  await db.raw(`
    ALTER TABLE ${SCHEMA}.periodo_letivo
    ADD CONSTRAINT periodo_letivo_datas_check CHECK (data_fim >= data_inicio)
  `);

  await db.schema.withSchema(SCHEMA).createTable("curso_disciplina", (table) => {
    uuidPrimary(table, db);
    table.uuid("curso_id").notNullable().references("id").inTable(`${SCHEMA}.curso`).onDelete("CASCADE");
    table.uuid("disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.disciplinas`).onDelete("CASCADE");
    table.integer("periodo_ideal");
    table.boolean("obrigatoria").notNullable().defaultTo(true);
    table.integer("carga_horaria").notNullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    addTimestamps(table, db);
    table.unique(["curso_id", "disciplina_id"]);
  });

  await db.schema.withSchema(SCHEMA).createTable("turma", (table) => {
    uuidPrimary(table, db);
    table.uuid("periodo_letivo_id").notNullable().references("id").inTable(`${SCHEMA}.periodo_letivo`).onDelete("RESTRICT");
    table.uuid("curso_id").notNullable().references("id").inTable(`${SCHEMA}.curso`).onDelete("RESTRICT");
    table.integer("periodo_curricular").notNullable();
    table.string("descricao").notNullable();
    table.string("sigla").notNullable();
    table.integer("capacidade_alunos").notNullable();
    table.string("turno").notNullable();
    table.string("status").notNullable().defaultTo("ativa");
    addTimestamps(table, db);
    table.unique(["periodo_letivo_id", "curso_id", "sigla"]);
  });

  await db.raw(`
    ALTER TABLE ${SCHEMA}.turma
    ADD CONSTRAINT turma_capacidade_check CHECK (capacidade_alunos > 0)
  `);

  await db.schema.withSchema(SCHEMA).createTable("turma_disciplina", (table) => {
    uuidPrimary(table, db);
    table.uuid("turma_id").notNullable().references("id").inTable(`${SCHEMA}.turma`).onDelete("CASCADE");
    table.uuid("curso_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.curso_disciplina`).onDelete("RESTRICT");
    table.uuid("professor_id").notNullable().references("id").inTable(`${SCHEMA}.professor`).onDelete("RESTRICT");
    table.string("status").notNullable().defaultTo("ativa");
    addTimestamps(table, db);
    table.unique(["turma_id", "curso_disciplina_id"]);
  });

  await db.schema.withSchema(SCHEMA).createTable("matricula", (table) => {
    uuidPrimary(table, db);
    table.uuid("aluno_id").notNullable().references("id").inTable(`${SCHEMA}.aluno`).onDelete("CASCADE");
    table.uuid("curso_id").notNullable().references("id").inTable(`${SCHEMA}.curso`).onDelete("RESTRICT");
    table.uuid("turma_id").notNullable().references("id").inTable(`${SCHEMA}.turma`).onDelete("RESTRICT");
    table.string("status").notNullable().defaultTo("ativa");
    table.date("data_matricula").notNullable().defaultTo(db.fn.now());
    addTimestamps(table, db);
    table.unique(["aluno_id", "turma_id"]);
  });

  await db.schema.withSchema(SCHEMA).createTable("matricula_turma_disciplina", (table) => {
    uuidPrimary(table, db);
    table.uuid("turma_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.turma_disciplina`).onDelete("CASCADE");
    table.uuid("matricula_id").notNullable().references("id").inTable(`${SCHEMA}.matricula`).onDelete("CASCADE");
    table.string("status").notNullable().defaultTo("ativa");
    table.date("data_vinculo").notNullable().defaultTo(db.fn.now());
    addTimestamps(table, db);
    table.unique(["matricula_id", "turma_disciplina_id"]);
  });

  await db.schema.withSchema(SCHEMA).createTable("matricula_documento", (table) => {
    uuidPrimary(table, db);
    table.uuid("matricula_id").notNullable().references("id").inTable(`${SCHEMA}.matricula`).onDelete("CASCADE");
    table.string("tipo_documento").notNullable();
    table.string("nome_arquivo").notNullable();
    table.string("caminho_arquivo");
    table.binary("documento");
    table.boolean("valido").notNullable().defaultTo(false);
    addTimestamps(table, db);
  });

  await db.schema.withSchema(SCHEMA).createTable("avaliacao", (table) => {
    uuidPrimary(table, db);
    table.string("tipo_avaliacao").notNullable();
    table.text("descricao_avaliacao");
    table.timestamp("data_lancamento", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.decimal("valor", 10, 2);
    table.decimal("nota", 5, 2);
    table.date("data_devolucao");
    table.uuid("turma_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.turma_disciplina`).onDelete("CASCADE");
    table.uuid("matricula_turma_disciplina_id").references("id").inTable(`${SCHEMA}.matricula_turma_disciplina`).onDelete("CASCADE");
  });

  await db.schema.withSchema(SCHEMA).createTable("aula", (table) => {
    uuidPrimary(table, db);
    table.timestamp("data", { useTz: true }).notNullable();
    table.uuid("local_id").notNullable().references("id").inTable(`${SCHEMA}.local`).onDelete("RESTRICT");
    table.uuid("professor_id").notNullable().references("id").inTable(`${SCHEMA}.professor`).onDelete("RESTRICT");
    table.uuid("turma_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.turma_disciplina`).onDelete("CASCADE");
  });

  await db.schema.withSchema(SCHEMA).createTable("frequencia", (table) => {
    uuidPrimary(table, db);
    table.uuid("aula_id").notNullable().references("id").inTable(`${SCHEMA}.aula`).onDelete("CASCADE");
    table.uuid("matricula_turma_disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.matricula_turma_disciplina`).onDelete("CASCADE");
    table.string("status").notNullable();
    table.date("data").notNullable();
    addTimestamps(table, db);
    table.unique(["aula_id", "matricula_turma_disciplina_id"]);
  });
};

export async function up(db: Knex): Promise<void> {
  await db.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await db.raw(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await dropAcademicTables(db);
  await createAcademicTables(db);
}

export async function down(db: Knex): Promise<void> {
  await dropAcademicTables(db);
}
