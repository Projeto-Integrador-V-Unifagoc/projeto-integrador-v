import { Pool } from "pg";

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "sistema_academico",
  password: "Unifagoc@2026",
  port: 5432,
});
