import type { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config({ path: "../.env.development" });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      host: String(process.env.DATABASE_HOST || "localhost"),
      port: Number(process.env.DATABASE_PORT ||  5432),
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD),
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: "knex_migrations",
      directory: "../migrations",
    },
  },
  staging: {
    client: "pg",
    connection: {
      host: String(process.env.DATABASE_HOST || "localhost"),
      port: Number(process.env.DATABASE_PORT || 5432),
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD),
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: "knex_migrations",
      directory: "../migrations",
    },
  },
  production: {
    client: "pg",
    connection: {
      host: String(process.env.DATABASE_HOST || "localhost"),
      port: Number(process.env.DATABASE_PORT || 5432),
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD),
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: "knex_migrations",
      directory: "../migrations",
    },
  },
};

export default config;