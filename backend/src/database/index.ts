import dotenv from "dotenv";
import knex from "knex";

dotenv.config({ path: ".env.development" });

const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL || process.env.DATABASE || {
    host: "db",
    port: 5432,
    user: "grupo_4",
    password: "grupo_41235",
    database: "projeto_integrador",
  },
});

export default db;
