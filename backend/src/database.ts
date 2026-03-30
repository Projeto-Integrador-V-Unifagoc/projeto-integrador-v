import { Pool } from 'pg';
import 'dotenv/config';

export const db = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'unieduca',
});

export async function setupDatabase() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS matriculas (
            id SERIAL PRIMARY KEY,
            aluno_id INTEGER NOT NULL,
            aluno_nome TEXT,
            periodo_letivo TEXT NOT NULL,
            disciplinas JSONB NOT NULL,
            situacao TEXT NOT NULL DEFAULT 'MATRICULADO'
                CHECK (situacao IN ('MATRICULADO', 'TRANCADO', 'CANCELADO')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_matricula_aluno_periodo
        ON matriculas (aluno_id, periodo_letivo);
    `);
}
