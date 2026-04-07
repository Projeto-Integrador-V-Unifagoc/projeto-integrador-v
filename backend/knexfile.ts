import type { Knex } from "knex";

require('dotenv').config({ path: '.env.development' });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      database: String(process.env.DATABASE_NAME),
      user: String(process.env.DATABASE_USERNAME),
      password: String(process.env.DATABASE_PASSWORD)
    },
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