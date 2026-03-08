import knex from "knex";

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE || {
    host: 'db',
    port: 5432,
    user: 'grupo_4',
    password: 'grupo_4@123',
    database: 'projeto_integrador',
  },
});

export default db