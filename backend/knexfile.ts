import type { Knex } from "knex";


require('dotenv').config({ path: '.env' }); 

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost", 
      port: Number(process.env.DB_PORT) || 5432, 
      database: String(process.env.DB_NAME),     
      user: String(process.env.DB_USER),         
      password: String(process.env.DB_PASSWORD)  
    },
    searchPath: ['piv'],
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
      extension: 'ts' 
    }
  }
};

module.exports = config;