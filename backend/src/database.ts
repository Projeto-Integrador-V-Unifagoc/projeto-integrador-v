import Knex from 'knex';
import 'dotenv/config';

export const db = Knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD|| 'postgres',
    database: process.env.DB_NAME || 'postgres',
  },
});
