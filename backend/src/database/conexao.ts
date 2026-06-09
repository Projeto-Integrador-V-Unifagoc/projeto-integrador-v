import path from 'path';
import knex from 'knex';
import dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../.env.development');
const defaultEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: defaultEnvPath });

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.DATABASE_PORT) || 5432,
    user: process.env.DB_USER || process.env.DATABASE_USERNAME,
    password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD,
    database: process.env.DB_NAME || process.env.DATABASE_NAME,
  },
});

export default db;