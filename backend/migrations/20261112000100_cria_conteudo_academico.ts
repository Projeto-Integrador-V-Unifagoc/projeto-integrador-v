import type { Knex } from "knex";

const SCHEMA = "piv";

const uuidPrimary = (table: Knex.CreateTableBuilder, db: Knex) => {
  table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
};

const addTimestamps = (table: Knex.CreateTableBuilder, db: Knex) => {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
};

const usuarioFk = (table: Knex.CreateTableBuilder, coluna: string) =>
  table.uuid(coluna).references("id").inTable(`${SCHEMA}.usuario`).onDelete("SET NULL");

/**
 * Conteúdo acadêmico montado pelo professor: Tópico → Página → blocos.
 *
 * O dono do conteúdo é a disciplina dentro do curso (`curso_disciplina`), não o
 * usuário. `conteudo_disciplina` guarda o professor responsável (único que edita
 * além da secretaria/administrador); a unique em `curso_disciplina_id` impede
 * que dois professores assumam a mesma disciplina ao mesmo tempo.
 *
 * As colunas de autoria apontam para `usuario`, porque secretaria e
 * administrador também editam e não têm registro em `professor`.
 */
export async function up(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).createTable("conteudo_disciplina", (table) => {
    uuidPrimary(table, db);
    table.uuid("curso_disciplina_id").notNullable().unique()
      .references("id").inTable(`${SCHEMA}.curso_disciplina`).onDelete("RESTRICT");
    table.uuid("responsavel_professor_id").references("id").inTable(`${SCHEMA}.professor`).onDelete("RESTRICT");
    table.timestamp("responsavel_desde", { useTz: true });
    usuarioFk(table, "transferido_por_usuario_id");
    addTimestamps(table, db);
  });

  await db.schema.withSchema(SCHEMA).createTable("conteudo_topico", (table) => {
    uuidPrimary(table, db);
    table.uuid("curso_disciplina_id").notNullable()
      .references("id").inTable(`${SCHEMA}.curso_disciplina`).onDelete("RESTRICT");
    table.string("titulo", 150).notNullable();
    table.text("descricao");
    table.integer("ordem").notNullable();
    table.boolean("publicado").notNullable().defaultTo(false);
    table.timestamp("publicado_em", { useTz: true });
    usuarioFk(table, "publicado_por_usuario_id");
    usuarioFk(table, "criado_por_usuario_id");
    usuarioFk(table, "atualizado_por_usuario_id");
    addTimestamps(table, db);
    table.index(["curso_disciplina_id", "ordem"], "conteudo_topico_ordem_idx");
  });

  await db.schema.withSchema(SCHEMA).createTable("conteudo_pagina", (table) => {
    uuidPrimary(table, db);
    table.uuid("topico_id").notNullable()
      .references("id").inTable(`${SCHEMA}.conteudo_topico`).onDelete("CASCADE");
    table.string("titulo", 150);
    table.integer("ordem").notNullable();
    table.boolean("oculta").notNullable().defaultTo(false);
    table.jsonb("blocos").notNullable().defaultTo(db.raw("'[]'::jsonb"));
    table.integer("versao").notNullable().defaultTo(1);
    table.integer("palavras").notNullable().defaultTo(0);
    table.integer("imagens").notNullable().defaultTo(0);
    table.integer("videos").notNullable().defaultTo(0);
    table.integer("arquivos").notNullable().defaultTo(0);
    table.integer("links").notNullable().defaultTo(0);
    table.decimal("minutos_estimados", 6, 2).notNullable().defaultTo(0);
    usuarioFk(table, "criado_por_usuario_id");
    usuarioFk(table, "atualizado_por_usuario_id");
    addTimestamps(table, db);
    table.index(["topico_id", "ordem"], "conteudo_pagina_ordem_idx");
  });

  await db.schema.withSchema(SCHEMA).createTable("conteudo_arquivo", (table) => {
    uuidPrimary(table, db);
    table.uuid("curso_disciplina_id").notNullable()
      .references("id").inTable(`${SCHEMA}.curso_disciplina`).onDelete("RESTRICT");
    table.string("nome_original", 255).notNullable();
    table.string("caminho", 500).notNullable();
    table.string("mime", 120).notNullable();
    table.integer("tamanho_bytes").notNullable();
    usuarioFk(table, "enviado_por_usuario_id");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["curso_disciplina_id"], "conteudo_arquivo_curso_disciplina_idx");
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema(SCHEMA).dropTableIfExists("conteudo_arquivo");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("conteudo_pagina");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("conteudo_topico");
  await db.schema.withSchema(SCHEMA).dropTableIfExists("conteudo_disciplina");
}
