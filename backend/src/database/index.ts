import dotenv from "dotenv";
import knex from "knex";

dotenv.config({ path: ".env.development" });
dotenv.config(); // fallback para .env quando .env.development nao existe (ex.: Docker)

// Prefere uma connection string (DATABASE_URL/DATABASE); caso contrario, monta a
// conexao a partir das mesmas variaveis do knexfile/docker-compose
// (DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD). Defaults locais por ultimo.
const connection =
  process.env.DATABASE_URL ||
  process.env.DATABASE || {
    host: process.env.DATABASE_HOST || "postgres",
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USERNAME || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    database: process.env.DATABASE_NAME || "postgres",
  };

const db = knex({
  client: "pg",
  connection,
  searchPath: ["piv", "public"],
});

export default db;
