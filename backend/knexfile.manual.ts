import type { Knex } from "knex";

const configuracoes = require("./knexfile") as Record<string, Knex.Config>;

module.exports = Object.fromEntries(
  Object.entries(configuracoes).map(([ambiente, configuracao]) => [
    ambiente,
    {
      ...configuracao,
      seeds: { ...configuracao.seeds, directory: "./seeds/manuais" },
    },
  ]),
);
