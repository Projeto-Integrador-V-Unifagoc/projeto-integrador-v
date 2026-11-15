import type { Knex } from "knex";

const SCHEMA = "piv";

export async function up(db: Knex): Promise<void> {
  await db.raw(`
    CREATE OR REPLACE FUNCTION ${SCHEMA}.criar_matriz_inicial_curso()
    RETURNS trigger AS $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM ${SCHEMA}.matriz_curricular WHERE curso_id = NEW.id) THEN
        INSERT INTO ${SCHEMA}.matriz_curricular
          (id, curso_id, codigo, versao, status, vigencia_inicio, publicada_em)
        VALUES
          (gen_random_uuid(), NEW.id, 'LEGADO', 'Matriz inicial', 'VIGENTE', CURRENT_DATE, NOW());
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER curso_criar_matriz_inicial
      AFTER INSERT ON ${SCHEMA}.curso
      FOR EACH ROW EXECUTE FUNCTION ${SCHEMA}.criar_matriz_inicial_curso();

    CREATE OR REPLACE FUNCTION ${SCHEMA}.preencher_matriz_curricular()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.matriz_curricular_id IS NULL THEN
        SELECT id INTO NEW.matriz_curricular_id
          FROM ${SCHEMA}.matriz_curricular
         WHERE curso_id = NEW.curso_id AND status = 'VIGENTE'
         LIMIT 1;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER curso_disciplina_preencher_matriz
      BEFORE INSERT ON ${SCHEMA}.curso_disciplina
      FOR EACH ROW EXECUTE FUNCTION ${SCHEMA}.preencher_matriz_curricular();

    CREATE TRIGGER turma_preencher_matriz
      BEFORE INSERT ON ${SCHEMA}.turma
      FOR EACH ROW EXECUTE FUNCTION ${SCHEMA}.preencher_matriz_curricular();
  `);
}

export async function down(db: Knex): Promise<void> {
  await db.raw(`
    DROP TRIGGER IF EXISTS turma_preencher_matriz ON ${SCHEMA}.turma;
    DROP TRIGGER IF EXISTS curso_disciplina_preencher_matriz ON ${SCHEMA}.curso_disciplina;
    DROP FUNCTION IF EXISTS ${SCHEMA}.preencher_matriz_curricular();
    DROP TRIGGER IF EXISTS curso_criar_matriz_inicial ON ${SCHEMA}.curso;
    DROP FUNCTION IF EXISTS ${SCHEMA}.criar_matriz_inicial_curso();
  `);
}
