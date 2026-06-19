import dotenv from "dotenv";
import knex from "knex";

dotenv.config({ path: ".env.development" });

const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL || process.env.DATABASE || {    
    host: "postgres",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  },
  searchPath: ['piv', 'public'],
});

console.log('DATABASE_URL:', process.env.DATABASE_URL)

export default db;
