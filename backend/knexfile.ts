import type { Knex } from "knex";

// Load .env.development for local dev; in Docker the env vars come from docker-compose.
require("dotenv").config({ path: ".env.development" });
require("dotenv").config();

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

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection,
    // Application tables live in `piv`; existing Knex metadata lives in `public`.
    searchPath: ["piv", "public"],
    seeds: {
      directory: "./seeds",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      schemaName: "public",
      directory: "./migrations",
    },
  },

  staging: {
    client: process.env.DATABASE_CLIENT,
    connection: {
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      schemaName: "public",
      directory: "./migrations",
    },
  },

  production: {
    client: "postgresql",
    connection: {
      database: "my_db",
      user: "username",
      password: "password",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
  },
};

module.exports = config;
