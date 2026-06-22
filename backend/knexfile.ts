import type { Knex } from "knex";

// Load .env.development for local dev; in Docker the env vars come from docker-compose
require('dotenv').config({ path: '.env.development' });
require('dotenv').config(); // fallback to .env if .env.development is absent

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DATABASE_HOST || "localhost",
      port: Number(process.env.DATABASE_PORT) || 5432,
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD)
    },
    // As tabelas da aplicação ficam em `piv`, enquanto o histórico do Knex
    // existente fica em `public`. Ambos precisam estar visíveis no startup.
    searchPath: ['piv'],
    seeds: {
      directory: "./seeds"
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      schemaName: "piv",
      directory: "./migrations"
    }
  },

  staging: {
    client: process.env.DATABASE_CLIENT,
    connection: {
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD)
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      schemaName: "piv",
      directory: "./migrations"
    }
  },

  production: {
    client: "postgresql",
    connection: {
      database: "my_db",
      user: "username",
      password: "password"
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations"
    }
  }

};

module.exports = config;
