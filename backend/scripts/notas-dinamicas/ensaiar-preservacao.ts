import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Knex } from "knex";
import { estaEmModoTeste } from "../../src/config/ambienteTeste";
import { startPgIntegration } from "../../src/test-helpers/pgIntegration";
import { criarHistoricoPontuacao, type ModeloHistoricoPontuacao } from "../../src/test-helpers/historicoPontuacao";
import { gerarPreflight, inventariarRegistros, REFERENCIA_LEGADO } from "./preflight";
import { executarRetorno, fonteMigrationsPontuacao, MIGRATIONS_PONTUACAO } from "./retorno";

const backend = path.resolve(__dirname, "../..");
const diretorio = path.resolve(backend, "../specs/001-notas-dinamicas/manifestos");
const compativeis = ["completo", "incompleto", "zero", "ausente", "recuperacao"] as const;
const incompativeis: ModeloHistoricoPontuacao[] = ["cinco_provas20", "regular50_rec80_retificado70",
  "matriz_curso_divergente", "nota_oferta_divergente", "duas_tpi5", "trabalhos36", "nota_acima_maximo"];

async function colunasOriginais(db: Knex): Promise<Record<string, string[]>> {
  const linhas = await db("information_schema.columns").where({ table_schema: "piv" })
    .select("table_name", "column_name").orderBy(["table_name", "ordinal_position"]);
  const colunas: Record<string, string[]> = {};
  for (const linha of linhas) (colunas[String(linha.table_name)] ??= []).push(String(linha.column_name));
  return colunas;
}

async function ledger(db: Knex) {
  return db("public.knex_migrations").select("name", "batch", "migration_time").orderBy("name");
}

async function adotar(db: Knex) {
  const { fonte } = await fonteMigrationsPontuacao();
  return db.migrate.latest({ migrationSource: fonte, tableName: "knex_migrations", schemaName: "public" });
}

function cli(databaseUrl: string, exitEsperado: number) {
  const resultado = spawnSync(process.execPath, ["-r", "ts-node/register", "scripts/notas-dinamicas/preflight.ts",
    "--ambiente", "teste", "--destino-env", "PONTUACAO_DESTINO_ENSAIO", "--referencia-codigo", REFERENCIA_LEGADO], {
    cwd: backend, env: { ...process.env, PONTUACAO_DESTINO_ENSAIO: databaseUrl }, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(resultado.status, exitEsperado, "Código de término do preflight CLI divergente.");
  // Nenhum stderr/URL é copiado para o artefato ou log.
  assert.equal(resultado.stderr.trim(), "", "CLI produziu diagnóstico inesperado.");
  const relatorio = JSON.parse(resultado.stdout) as Awaited<ReturnType<typeof gerarPreflight>>;
  assert.equal(relatorio.apto, exitEsperado === 0);
  return { exitCode: resultado.status, relatorio };
}

async function salvar(nome: string, dados: unknown) {
  await writeFile(path.join(diretorio, `${nome}.json`), `${JSON.stringify(dados, null, 2)}\n`, "utf8");
}

async function ensaiarCompativeis() {
  const pg = await startPgIntegration({ fronteiraHistorica: true });
  try {
    for (const modelo of compativeis) await criarHistoricoPontuacao(pg.db, modelo);
    const colunas = await colunasOriginais(pg.db);
    const antes = await inventariarRegistros(pg.db, colunas);
    const migrationsAntes = await ledger(pg.db);
    assert.equal(migrationsAntes.length, 13);
    const preflight = await gerarPreflight(pg.db, { referenciaCodigo: REFERENCIA_LEGADO });
    assert.equal(preflight.apto, true);
    const comando = cli(pg.databaseUrl, 0);
    assert.deepEqual(comando.relatorio.manifesto.registros, preflight.manifesto.registros);
    assert.deepEqual(await inventariarRegistros(pg.db, colunas), antes);
    await adotar(pg.db);
    const depoisAdocao = await inventariarRegistros(pg.db, colunas);
    const migrationsAdotadas = await ledger(pg.db);
    assert.deepEqual(depoisAdocao, antes);
    assert.equal(migrationsAdotadas.length, 16);
    assert.deepEqual(migrationsAdotadas.filter((m) => !MIGRATIONS_PONTUACAO.includes(m.name)), migrationsAntes);
    const regras = await pg.db("piv.regra_pontuacao").select("origem", "total_pontos");
    assert.equal(regras.length, 5);
    assert.ok(regras.every((r) => r.origem === "HISTORICA" && r.total_pontos === "100.00"));
    await executarRetorno(pg.db);
    const depoisRetorno = await inventariarRegistros(pg.db, colunas);
    const migrationsRetorno = await ledger(pg.db);
    assert.deepEqual(depoisRetorno, antes);
    assert.deepEqual(migrationsRetorno, migrationsAntes);
    assert.equal(await pg.db.schema.withSchema("piv").hasTable("regra_pontuacao"), false);
    await salvar("compativeis-adocao-retorno", { modelos: compativeis, preflight, cli: comando,
      colunasOriginais: colunas, antes, depoisAdocao, depoisRetorno,
      migrationsAntes, migrationsAdotadas, migrationsRetorno, registrosOriginaisPreservados: true });
    process.stdout.write("Cinco modelos compatíveis: adoção/retorno e CLI0 preservaram os registros.\n");
  } finally { await pg.stop(); }
}

async function ensaiarIncompativel(modelo: ModeloHistoricoPontuacao) {
  const pg = await startPgIntegration({ fronteiraHistorica: true });
  try {
    await criarHistoricoPontuacao(pg.db, "completo"); // Uma parte apta não autoriza adoção parcial.
    await criarHistoricoPontuacao(pg.db, modelo);
    const colunas = await colunasOriginais(pg.db);
    const antes = await inventariarRegistros(pg.db, colunas);
    const migrationsAntes = await ledger(pg.db);
    const preflight = await gerarPreflight(pg.db, { referenciaCodigo: REFERENCIA_LEGADO });
    assert.equal(preflight.apto, false);
    const comando = cli(pg.databaseUrl, 2);
    assert.deepEqual(comando.relatorio.divergencias, preflight.divergencias);
    assert.deepEqual(comando.relatorio.manifesto.registros, preflight.manifesto.registros);
    await assert.rejects(adotar(pg.db), /HISTORICO_INCOMPATIVEL/);
    const depoisRecusa = await inventariarRegistros(pg.db, colunas);
    assert.deepEqual(depoisRecusa, antes);
    assert.deepEqual(await ledger(pg.db), migrationsAntes);
    assert.equal(await pg.db.schema.withSchema("piv").hasTable("regra_pontuacao"), false);
    await salvar(modelo, { modelo, preflight, cli: comando, colunasOriginais: colunas,
      antes, depoisRecusa, migrationsAntes, registrosOriginaisPreservados: true, adocaoParcial: false });
    process.stdout.write(`${modelo}: CLI2 e adoção recusados, conjunto integral preservado.\n`);
  } finally { await pg.stop(); }
}

async function ensaiar() {
  if (process.env.ACADEMICO_MODO_TESTE !== "true") throw new Error("Ensaio exige modo sintético explícito.");
  estaEmModoTeste(); // Rejeita produção antes de Docker, SQL ou arquivo de evidência.
  await mkdir(diretorio, { recursive: true });
  const arquivos = ["scripts/notas-dinamicas/preflight.ts", "scripts/notas-dinamicas/retorno.ts",
    "scripts/notas-dinamicas/calculo-legado.ts", "src/Modules/notas/models/ResultadoAcademico.ts",
    "src/test-helpers/historicoPontuacao.ts", ...MIGRATIONS_PONTUACAO.map((nome) => `migrations/${nome}`)];
  const fontes = [];
  for (const arquivo of arquivos) fontes.push({ arquivo, sha256: createHash("sha256").update(await readFile(path.join(backend, arquivo))).digest("hex") });
  const inicio = new Date();
  await ensaiarCompativeis();
  for (const modelo of incompativeis) await ensaiarIncompativel(modelo);
  await salvar("execucao", { inicio: inicio.toISOString(), fim: new Date().toISOString(), node: process.version,
    referenciaBase: REFERENCIA_LEGADO, fontes, modelos: 12, bancosProprios: 8, containersEncerrados: true,
    limites: ["Dados integralmente sintéticos", "Sem execução em alvo real", "Sem backup/restauração real"] });
  process.stdout.write("Ensaio concluído: 12 modelos, 8 bancos próprios encerrados e manifestos técnicos salvos.\n");
}

if (require.main === module) {
  ensaiar().catch((erro: unknown) => {
    // Somente diagnósticos do ensaio; driver/SQL/destino nunca chegam ao log.
    process.stderr.write(`Ensaio não concluído (${erro instanceof assert.AssertionError ? "asserção" : "operação"}); preservar evidências parciais e conferir a falha.\n`);
    process.exitCode = 1;
  });
}
