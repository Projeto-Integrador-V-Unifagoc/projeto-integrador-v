import { pool } from "./connection";

export async function createTables() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cursos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome VARCHAR(100) NOT NULL,
      duracao_periodos INT,
      modalidade VARCHAR(20),
      status VARCHAR(20)
    );
  `);

  console.log("Tabela cursos criada");
}
