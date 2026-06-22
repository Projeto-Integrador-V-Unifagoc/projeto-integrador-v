import dotenv from "dotenv";
import knex, { type Knex } from "knex";

dotenv.config({ path: ".env.development" });
dotenv.config();

function criarConfigConexao(): Knex.Config {
  const connection =
    process.env.DATABASE_URL ||
    process.env.DATABASE ||
    {
      host: process.env.DATABASE_HOST || "localhost",
      port: Number(process.env.DATABASE_PORT) || 5432,
      database: process.env.DATABASE_NAME || "projeto_integrador",
      user: process.env.DATABASE_USERNAME || "postgres",
      password: process.env.DATABASE_PASSWORD || "postgres",
    };

  return {
    client: "pg",
    connection,
    searchPath: ["piv", "public"],
    pool: {
      min: 2,
      max: 10,
    },
  };
}

export const db = knex(criarConfigConexao());
export default db;
