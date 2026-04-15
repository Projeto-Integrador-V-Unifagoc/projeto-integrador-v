import type { Knex } from "knex";

const SCHEMA = "piv";

const uuidPrimary = (table: Knex.CreateTableBuilder, db: Knex) => {
  table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
};

export async function up(db: Knex): Promise<void> {
  await db.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await db.raw(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await db.schema.withSchema(SCHEMA).dropTableIfExists("aula");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("avaliacao");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("aluno_turma");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("turma");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("aluno");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("professor");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("disciplinas");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("pessoa");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("curso");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("departamento");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("faculdade");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("frequencia");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("local");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("usuario");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("cidade");
  await db.schema.dropTableIfExists("alunos");
  await db.schema.dropTableIfExists("usuarios");
  await db.schema.dropTableIfExists("pessoas");

  await db.schema.withSchema(SCHEMA).createTable("cidade", (table) => {
    uuidPrimary(table, db);
    table.string("nome").notNullable();
    table.string("uf", 2).notNullable();
  });

  await db.schema.withSchema(SCHEMA).createTable("usuario", (table) => {
    uuidPrimary(table, db);
    table.string("email").notNullable().unique();
    table.string("senha").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.string("tipo_usuario").notNullable();
  });

  await db.schema.withSchema(SCHEMA).createTable("local", (table) => {
    uuidPrimary(table, db);
    table.string("codigo").notNullable().unique();
  });

  await db.schema.withSchema(SCHEMA).createTable("frequencia", (table) => {
    uuidPrimary(table, db);
    table.string("status").notNullable();
    table.date("data").notNullable();
  });

  await db.schema.withSchema(SCHEMA).createTable("faculdade", (table) => {
    uuidPrimary(table, db);
    table.string("nome").notNullable();
    table.uuid("cidade_id").notNullable().references("id").inTable(`${SCHEMA}.cidade`).onDelete("RESTRICT");
    table.string("logradouro").notNullable();
    table.string("numero").notNullable();
    table.string("bairro").notNullable();
    table.string("cep", 9).notNullable();
  });

  await db.schema.withSchema(SCHEMA).createTable("departamento", (table) => {
    uuidPrimary(table, db);
    table.string("codigo").notNullable().unique();
    table.string("nome").notNullable();
    table.uuid("faculdade_id").notNullable().references("id").inTable(`${SCHEMA}.faculdade`).onDelete("RESTRICT");
  });

  await db.schema.withSchema(SCHEMA).createTable("curso", (table) => {
    uuidPrimary(table, db);
    table.string("codigo").notNullable().unique();
    table.string("nome").notNullable();
    table.uuid("departamento_id").notNullable().references("id").inTable(`${SCHEMA}.departamento`).onDelete("RESTRICT");
  });

  await db.schema.withSchema(SCHEMA).createTable("pessoa", (table) => {
    uuidPrimary(table, db);
    table.string("nome").notNullable();
    table.date("data_nascimento").notNullable();
    table.string("logradouro").notNullable();
    table.string("numero").notNullable();
    table.string("bairro").notNullable();
    table.uuid("cidade_id").notNullable().references("id").inTable(`${SCHEMA}.cidade`).onDelete("RESTRICT");
    table.string("estado", 2).notNullable();
    table.string("cep", 9).notNullable();
    table.string("cpf", 14).notNullable().unique();
  });

  await db.schema.withSchema(SCHEMA).createTable("disciplinas", (table) => {
    uuidPrimary(table, db);
    table.string("codigo").notNullable().unique();
    table.string("nome").notNullable();
    table.uuid("curso_id").notNullable().references("id").inTable(`${SCHEMA}.curso`).onDelete("RESTRICT");
    table.string("pre_requisito");
    table.integer("carga_horaria").notNullable();
  });

  await db.schema.withSchema(SCHEMA).createTable("professor", (table) => {
    uuidPrimary(table, db);
    table.uuid("usuario_id").notNullable().unique().references("id").inTable(`${SCHEMA}.usuario`).onDelete("CASCADE");
    table.uuid("pessoa_id").notNullable().unique().references("id").inTable(`${SCHEMA}.pessoa`).onDelete("CASCADE");
    table.uuid("curso_id").notNullable().references("id").inTable(`${SCHEMA}.curso`).onDelete("RESTRICT");
    table.uuid("faculdade_id").notNullable().references("id").inTable(`${SCHEMA}.faculdade`).onDelete("RESTRICT");
  });

  await db.schema.withSchema(SCHEMA).createTable("aluno", (table) => {
    uuidPrimary(table, db);
    table.increments("matricula").unique();
    table.uuid("usuario_id").unique().references("id").inTable(`${SCHEMA}.usuario`).onDelete("CASCADE");
    table.uuid("pessoa_id").notNullable().unique().references("id").inTable(`${SCHEMA}.pessoa`).onDelete("CASCADE");
    table.uuid("curso_id").references("id").inTable(`${SCHEMA}.curso`).onDelete("RESTRICT");
    table.string("periodo").notNullable();
  });

  await db.schema.withSchema(SCHEMA).createTable("turma", (table) => {
    uuidPrimary(table, db);
    table.uuid("disciplina_id").notNullable().references("id").inTable(`${SCHEMA}.disciplinas`).onDelete("RESTRICT");
    table.string("semestre").notNullable();
    table.integer("capacidade_alunos").notNullable();
    table.uuid("professor_id").notNullable().references("id").inTable(`${SCHEMA}.professor`).onDelete("RESTRICT");
    table.uuid("curso_id").notNullable().references("id").inTable(`${SCHEMA}.curso`).onDelete("RESTRICT");
  });

  await db.schema.withSchema(SCHEMA).createTable("aluno_turma", (table) => {
    uuidPrimary(table, db);
    table.uuid("aluno_id").notNullable().references("id").inTable(`${SCHEMA}.aluno`).onDelete("CASCADE");
    table.boolean("aprovacao");
    table.uuid("turma_id").notNullable().references("id").inTable(`${SCHEMA}.turma`).onDelete("CASCADE");
    table.uuid("professor_id").references("id").inTable(`${SCHEMA}.professor`).onDelete("SET NULL");
    table.string("status");
    table.uuid("frequencia_id").references("id").inTable(`${SCHEMA}.frequencia`).onDelete("SET NULL");
    table.string("status_aprovado");
    table.date("data_aprovacao");
    table.decimal("frequencia", 5, 2);
    table.unique(["aluno_id", "turma_id"]);
  });

  await db.schema.withSchema(SCHEMA).createTable("avaliacao", (table) => {
    uuidPrimary(table, db);
    table.string("tipo_avaliacao").notNullable();
    table.text("descricao_avaliacao");
    table.timestamp("data_lancamento", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.decimal("valor", 10, 2);
    table.decimal("nota", 5, 2);
    table.date("data_devolucao");
    table.uuid("aluno_turma_id").references("id").inTable(`${SCHEMA}.aluno_turma`).onDelete("CASCADE");
    table.uuid("turma_id").notNullable().references("id").inTable(`${SCHEMA}.turma`).onDelete("CASCADE");
  });

  await db.schema.withSchema(SCHEMA).createTable("aula", (table) => {
    uuidPrimary(table, db);
    table.timestamp("data", { useTz: true }).notNullable();
    table.uuid("local_id").notNullable().references("id").inTable(`${SCHEMA}.local`).onDelete("RESTRICT");
    table.uuid("professor_id").notNullable().references("id").inTable(`${SCHEMA}.professor`).onDelete("RESTRICT");
    table.uuid("turma_id").notNullable().references("id").inTable(`${SCHEMA}.turma`).onDelete("CASCADE");
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).dropTableIfExists("aula");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("avaliacao");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("aluno_turma");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("turma");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("aluno");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("professor");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("disciplinas");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("pessoa");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("curso");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("departamento");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("faculdade");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("frequencia");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("local");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("usuario");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("cidade");
}
