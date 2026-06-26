import type { Knex } from "knex";

// Load .env.development for local dev; in Docker the env vars come from docker-compose.
require("dotenv").config({ path: ".env.development" });
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const getEnvOrThrow = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && isProduction) {
    throw new Error(`A variável de ambiente obrigatória ${key} não está definida.`);
  }
  return value || "";
};

const connection =
  process.env.DATABASE_URL ||
  process.env.DATABASE ||
  {
    host: getEnvOrThrow("DATABASE_HOST", "localhost"),
    port: Number(process.env.DATABASE_PORT) || 5432,
    database: getEnvOrThrow("DATABASE_NAME", "projeto_integrador"),
    user: getEnvOrThrow("DATABASE_USERNAME", "postgres"),
    password: getEnvOrThrow("DATABASE_PASSWORD", "postgres"),
  };

const commonConfig: Knex.Config = {
  client: "pg",
  connection,
  // Application tables live in `piv`; existing Knex metadata lives in `public`.
  searchPath: ["piv", "public"],
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: "knex_migrations",
    schemaName: "public",
    directory: "./migrations",
  },
  seeds: {
    directory: "./seeds",
  },
};

const config: { [key: string]: Knex.Config } = {
  development: commonConfig,
  staging: commonConfig,
  production: commonConfig,
};

module.exports = config;
