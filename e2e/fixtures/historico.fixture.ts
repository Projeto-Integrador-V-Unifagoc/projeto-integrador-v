import { randomUUID, createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { request, type APIRequestContext } from "@playwright/test";
import type { Knex } from "knex";
import { startPgIntegration, type PgIntegration } from "../../backend/src/test-helpers/pgIntegration";
import { criarHistoricoPontuacao, type HistoricoPontuacao, type ModeloHistoricoPontuacao } from "../../backend/src/test-helpers/historicoPontuacao";
import { assinarToken } from "../../backend/src/test-helpers/httpAuth";
import { calcularBoletim, type BoletimDisciplina } from "../../backend/scripts/notas-dinamicas/calculo-legado";
import { gerarPreflight, REFERENCIA_LEGADO, type RelatorioPreflight } from "../../backend/scripts/notas-dinamicas/preflight";
import { Api } from "../helpers/api.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NOVAS = ["20260928000100_expande_pontuacao_dinamica.ts", "20260928000200_adota_pontuacao_historica.ts", "20260928000300_protege_pontuacao_dinamica.ts"];
export const CENARIOS_HISTORICOS = [
  { nome: "suficiente-frequencia75", modelo: "completo", presencas: 3, faltas: 1 },
  { nome: "suficiente-frequencia50", modelo: "completo", presencas: 1, faltas: 1 },
  { nome: "suficiente-sem-frequencia", modelo: "completo", presencas: 0, faltas: 0 },
  { nome: "incompleto", modelo: "incompleto", presencas: 3, faltas: 1 },
  { nome: "zero", modelo: "zero", presencas: 3, faltas: 1 },
  { nome: "ausente", modelo: "ausente", presencas: 3, faltas: 1 },
  { nome: "recuperacao", modelo: "recuperacao", presencas: 3, faltas: 1 },
] as const;

export interface CasoHistorico extends HistoricoPontuacao {
  nome: string; modelo: ModeloHistoricoPontuacao; presencas: number; faltas: number;
  professorId: string; usuarioProfessorId: string; usuarioAlunoId: string;
  legado: BoletimDisciplina;
}
interface ReferenciaTabela { colunas: string[]; chaves: string[]; ids: unknown[][]; quantidade: number; sha256: string }
export type ReferenciaHistorica = Record<string, ReferenciaTabela>;

/** Compara todas as colunas originais e somente linhas anteriores, mesmo depois de novos períodos. */
export async function capturarHistorico(db: Knex, original?: ReferenciaHistorica): Promise<ReferenciaHistorica> {
  const nomes = original ? Object.keys(original) : (await db("pg_tables").where({ schemaname: "piv" }).select("tablename").orderBy("tablename")).map((t) => String(t.tablename));
  const referencia: ReferenciaHistorica = {};
  for (const tabela of nomes) {
    const colunas = original?.[tabela].colunas ?? (await db("information_schema.columns").where({ table_schema: "piv", table_name: tabela })
      .select("column_name").orderBy("ordinal_position")).map((c) => String(c.column_name));
    const chaves = original?.[tabela].chaves ?? (await db("information_schema.table_constraints as tc")
      .join("information_schema.key_column_usage as kcu", function () {
        this.on("tc.constraint_name", "kcu.constraint_name").andOn("tc.constraint_schema", "kcu.constraint_schema");
      }).where({ "tc.table_schema": "piv", "tc.table_name": tabela, "tc.constraint_type": "PRIMARY KEY" })
      .select("kcu.column_name").orderBy("kcu.ordinal_position")).map((c) => String(c.column_name));
    if (!chaves.length) throw new Error("Manifesto histórico exige chave primária explícita em todas as tabelas.");
    let consulta = db(`piv.${tabela}`).select(colunas);
    if (original) consulta = original[tabela].ids.length ? (chaves.length === 1
      ? consulta.whereIn(chaves[0], original[tabela].ids.map((valores) => valores[0]) as any[])
      : consulta.whereIn(chaves, original[tabela].ids as any[][])) : consulta.whereRaw("false");
    const linhas = await consulta;
    referencia[tabela] = { colunas, chaves, ids: original?.[tabela].ids ?? linhas.map((r) => chaves.map((chave) => r[chave])), quantidade: linhas.length,
      sha256: createHash("sha256").update(JSON.stringify(linhas.map((r) => JSON.stringify(r)).sort())).digest("hex") };
  }
  return referencia;
}

async function carregarCaso(db: Knex, entrada: typeof CENARIOS_HISTORICOS[number]): Promise<CasoHistorico> {
  const f = await criarHistoricoPontuacao(db, entrada.modelo);
  const oferta = await db("piv.turma_disciplina").where({ id: f.ofertaId }).first("professor_id");
  const professorId = String(oferta.professor_id), usuarioProfessorId = randomUUID(), usuarioAlunoId = randomUUID();
  await db.transaction(async (trx) => {
    await trx("piv.usuario").insert([
      { id: usuarioProfessorId, nome: "Professor histórico sintético", email: `${usuarioProfessorId}@example.test`, senha: "fixture-sem-login", tipo_usuario: "professor" },
      { id: usuarioAlunoId, nome: "Aluno histórico sintético", email: `${usuarioAlunoId}@example.test`, senha: "fixture-sem-login", tipo_usuario: "aluno" },
    ]);
    await trx("piv.professor").where({ id: professorId }).update({ usuario_id: usuarioProfessorId });
    await trx("piv.aluno").where({ id: f.alunoId }).update({ usuario_id: usuarioAlunoId });
    const local = randomUUID(); await trx("piv.local").insert({ id: local, codigo: local });
    const periodo = await trx("piv.periodo_letivo").where({ id: f.periodoId }).first("ano");
    for (let i = 0; i < entrada.presencas + entrada.faltas; i++) {
      const aula = randomUUID(), data = `${periodo.ano}-02-${String(i + 1).padStart(2, "0")}`;
      await trx("piv.aula").insert({ id: aula, data, professor_id: professorId, turma_disciplina_id: f.ofertaId, local_id: local });
      await trx("piv.frequencia").insert({ id: randomUUID(), aula_id: aula, matricula_turma_disciplina_id: f.matriculaDisciplinaId,
        status: i < entrada.presencas ? "PRESENTE" : "AUSENTE", data,
        responsavel_lancamento_usuario_id: usuarioProfessorId, lancada_em: `${data}T12:00:00Z` });
    }
  });
  const notas = await db("piv.nota").where({ matricula_turma_disciplina_id: f.matriculaDisciplinaId });
  const legado = calcularBoletim(f.avaliacoes.map((a) => ({ id: a.id, tipo: a.tipo, descricao: null, valor: Number(a.valor) })),
    new Map(notas.map((n) => [String(n.avaliacao_id), Number(n.valor)])));
  return { ...f, ...entrada, professorId, usuarioProfessorId, usuarioAlunoId, legado };
}

async function iniciarServidor(databaseUrl: string): Promise<{ processo: ChildProcess; url: string }> {
  const processo = spawn(process.execPath, ["--import", pathToFileURL(path.join(raiz, "backend/node_modules/tsx/dist/loader.mjs")).href,
    path.join(raiz, "e2e/fixtures/servidor-historico.ts")], {
    cwd: path.join(raiz, "backend"), env: { ...process.env, DATABASE_URL: databaseUrl,
      ACADEMICO_MODO_TESTE: "true", EMAIL_MODO_TESTE: "true", NODE_ENV: "development", VITEST: "historico", TZ: "America/Sao_Paulo" },
    stdio: ["ignore", "pipe", "pipe", "ipc"], windowsHide: true,
  });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let texto = "";
      const timer = setTimeout(() => reject(new Error("API histórica própria não ficou pronta.")), 30000);
      processo.once("error", (e) => { clearTimeout(timer); reject(e); });
      processo.once("exit", () => { clearTimeout(timer); reject(new Error("API histórica própria encerrou antes de ficar pronta.")); });
      processo.stdout!.on("data", (trecho) => {
        texto += trecho.toString(); const pronta = /API_HISTORICA_PRONTA:(\d+):(\d+)/.exec(texto);
        if (pronta) {
          clearTimeout(timer);
          if (Number(pronta[2]) !== processo.pid) reject(new Error("API histórica precisa pertencer ao processo filho criado."));
          else resolve(`http://127.0.0.1:${pronta[1]}`);
        }
      });
      // Drenar stderr; SQL/credenciais não são copiados para logs ou artefatos.
      processo.stderr!.on("data", () => {});
    });
    return { processo, url };
  } catch (erro) {
    if (processo.exitCode === null && processo.signalCode === null) {
      const finalizado = once(processo, "exit"); processo.kill(); await finalizado.catch(() => {});
    }
    throw erro;
  }
}

export interface HistoricoApi {
  pg: PgIntegration; casos: CasoHistorico[]; referencia: ReferenciaHistorica;
  preflight: RelatorioPreflight; depois: ReferenciaHistorica; ledgerAntes: any[]; ledgerDepois: any[];
  apiUrl: string; api(usuario: string, perfil: string): Api; dispose(): Promise<void>;
}

export async function iniciarHistoricoApi(): Promise<HistoricoApi> {
  if (process.env.ACADEMICO_MODO_TESTE !== "true") throw new Error("A fixture histórica exige ACADEMICO_MODO_TESTE=true.");
  const ambienteAnterior = { ...process.env };
  let pg: PgIntegration | undefined, processo: ChildProcess | undefined, contexto: APIRequestContext | undefined;
  async function dispose() {
    try { await contexto?.dispose(); }
    finally {
      try {
        if (processo && processo.exitCode === null && processo.signalCode === null) {
          let fechamentoConfirmado = false;
          processo.on("message", (m: any) => { if (m?.tipo === "api-historica-encerrada" && m.pid === processo!.pid) fechamentoConfirmado = true; });
          const finalizado = once(processo, "exit"); processo.send("encerrar");
          const timer = setTimeout(() => processo?.kill(), 10000);
          try {
            const [codigo, sinal] = await finalizado;
            if (codigo !== 0 || sinal || !fechamentoConfirmado) throw new Error("API histórica não confirmou encerramento normal e fechamento do pool.");
          } finally { clearTimeout(timer); }
        }
      } finally { try { await pg?.stop(); } finally { process.env = ambienteAnterior; } }
    }
  }
  try {
    pg = await startPgIntegration({ fronteiraHistorica: true });
    const ledgerAntes = await pg.db("public.knex_migrations").orderBy("id");
    if (ledgerAntes.length !== 13 || await pg.db.schema.withSchema("piv").hasTable("regra_pontuacao")) throw new Error("Fronteira histórica incorreta.");
    const casos: CasoHistorico[] = [];
    for (const entrada of CENARIOS_HISTORICOS) casos.push(await carregarCaso(pg.db, entrada));
    const referencia = await capturarHistorico(pg.db);
    const preflight = await gerarPreflight(pg.db, { referenciaCodigo: REFERENCIA_LEGADO });
    if (!preflight.apto) throw new Error("Preflight recusou o dataset histórico sintético.");
    const antigas = (await readdir(path.join(raiz, "backend/migrations"))).filter((n) => n.endsWith(".ts") && n < NOVAS[0]).sort();
    const fonte: Knex.MigrationSource<string> = {
      async getMigrations() { return [...antigas, ...NOVAS]; }, getMigrationName(n) { return n; },
      async getMigration(n) {
        if (!NOVAS.includes(n)) throw new Error("Migration antiga não pode ser reexecutada.");
        return import(path.join(raiz, "backend/migrations", n));
      },
    };
    await pg.db.migrate.latest({ migrationSource: fonte, tableName: "knex_migrations", schemaName: "public" });
    const depois = await capturarHistorico(pg.db, referencia);
    const ledgerDepois = await pg.db("public.knex_migrations").orderBy("id");
    const servidor = await iniciarServidor(pg.databaseUrl); processo = servidor.processo;
    contexto = await request.newContext();
    return { pg, casos, referencia, preflight, depois, ledgerAntes, ledgerDepois, apiUrl: servidor.url,
      api(usuario, perfil) { return new Api(contexto!, assinarToken(perfil, usuario), servidor.url); }, dispose };
  } catch (erro) { await dispose(); throw erro; }
}
