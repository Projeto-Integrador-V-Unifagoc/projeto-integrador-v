import type { Knex } from "knex";

require("dotenv").config({ path: "../.env.development" });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD),
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: "knex_migrations",
      directory: "./database/migrations",
    },
  },
  staging: {
    client: "pg",
    connection: {
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD),
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: "knex_migrations",
      directory: "./database/migrations",
    },
  },
  production: {
    client: "pg",
    connection: {
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD),
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: "knex_migrations",
      directory: "./database/migrations",
    },
  },
};

module.exports = config;
