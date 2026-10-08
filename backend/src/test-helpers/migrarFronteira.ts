import fs from "node:fs/promises";
import path from "node:path";
import knexLib from "knex";
import { configurarAmbienteTeste } from "../config/ambienteTeste";

/** Runner exclusivamente sintético: nunca aplicar normalizadores depois de inserir histórico. */
async function migrar() {
  const databaseUrl = configurarAmbienteTeste();
  if (!databaseUrl) throw new Error("A fronteira histórica exige o modo explícito de teste.");
  const fronteira = process.argv[2];
  if (!["historica", "expandida"].includes(fronteira)) throw new Error("Fronteira de teste inválida.");
  const limite = "20260928000100_expande_pontuacao_dinamica.ts";
  const diretorio = path.resolve(__dirname, "../../migrations");
  const arquivos = (await fs.readdir(diretorio)).filter((nome) => nome.endsWith(".ts")
    && (fronteira === "historica" ? nome < limite : nome <= limite)).sort();
  const banco = knexLib({ client: "pg", connection: databaseUrl, searchPath: ["piv", "public"] });
  try {
    const [, aplicadas] = await banco.migrate.latest({ tableName: "knex_migrations", schemaName: "public",
      migrationSource: {
        getMigrations: async () => arquivos,
        getMigrationName: (nome: string) => nome,
        getMigration: async (nome: string) => require(path.join(diretorio, nome)),
      },
    });
    process.stdout.write(`Fronteira ${fronteira}: ${aplicadas.length} migrations aplicadas.\n`);
  } finally { await banco.destroy(); }
}

migrar().catch(() => {
  // Não transportar SQL/conexão/valores de configuração para logs de erro.
  process.stderr.write("Falha ao preparar a fronteira histórica sintética.\n");
  process.exitCode = 1;
});
