import { createHash, randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Knex } from "knex";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { calcularBoletim, type AvaliacaoResumo } from "../../../scripts/notas-dinamicas/calculo-legado";

type Modelo = "completo" | "incompleto" | "zero" | "ausente" | "recuperacao" | "cinco_provas20" | "regular50_rec80_retificado70";
interface Historico {
  cursoId: string; periodoId: string; ofertaId: string; matriculaDisciplinaId: string; usuarioId: string;
  outraOfertaId: string; ofertaSemHistoricoId: string;
  avaliacoes: Array<{ id: string; tipo: AvaliacaoResumo["tipo"]; valor: string }>;
  notaIds: string[]; auditoriaIds: string[]; autorizacaoIds: string[];
}
type CriarHistorico = (db: Knex, modelo: Modelo) => Promise<Historico>;
type Retornar = (db: Knex) => Promise<void>;
let criarHistorico: CriarHistorico;
let executarRetorno: Retornar;
let pg: PgIntegration | undefined;
const NOVAS = ["20260928000100_expande_pontuacao_dinamica.ts", "20260928000200_adota_pontuacao_historica.ts", "20260928000300_protege_pontuacao_dinamica.ts"];

// T078 prepara o aceite antes de datasets/adoção/retorno. Módulo ausente falha no
// setup após coleta, antes de iniciar PostgreSQL; não equivale a asserção RED.
beforeAll(async () => {
  const caminhoFixture = "../../test-helpers/historicoPontuacao.ts";
  const fixture = await import(caminhoFixture);
  if (typeof fixture.criarHistoricoPontuacao !== "function") {
    throw new Error("T079 pendente: export do histórico não disponível.");
  }
  criarHistorico = fixture.criarHistoricoPontuacao;
  // Adoção pode ser verificada antes de T083; os casos de retorno conservam o aceite.
  executarRetorno = async (db) => {
    const caminhoRetorno = "../../../scripts/notas-dinamicas/retorno.ts";
    const retorno = await import(caminhoRetorno);
    if (typeof retorno.executarRetorno !== "function") throw new Error("T083 pendente: export do retorno não disponível.");
    return retorno.executarRetorno(db);
  };
});
afterEach(async () => { try { await pg?.stop(); } finally { pg = undefined; } });

async function preparar(modelo: Modelo) {
  pg = await startPgIntegration({ fronteiraHistorica: true });
  expect(await pg.db("public.knex_migrations")).toHaveLength(13);
  expect(await pg.db.schema.withSchema("piv").hasTable("regra_pontuacao")).toBe(false);
  return { db: pg.db, fixture: await criarHistorico(pg.db, modelo) };
}

/** O ledger valida também as13 antigas; nenhuma delas pode ser carregada/reexecutada. */
async function adotar(db: Knex) {
  const arquivos = await readdir(path.resolve(__dirname, "../../../migrations"));
  const antigas = arquivos.filter((nome) => nome.endsWith(".ts") && nome < NOVAS[0]).sort();
  expect(antigas).toHaveLength(13);
  const fonte: Knex.MigrationSource<string> = {
    async getMigrations() { return [...antigas, ...NOVAS]; },
    getMigrationName(nome) { return nome; },
    async getMigration(nome) {
      if (!NOVAS.includes(nome)) throw new Error(`Migration antiga não pode ser reexecutada: ${nome}`);
      const caminho = `../../../migrations/${nome}`;
      return import(caminho);
    },
  };
  return db.migrate.latest({ migrationSource: fonte, tableName: "knex_migrations", schemaName: "public" });
}

interface Snapshot { tabelas: Record<string, { colunas: string[]; quantidade: number; sha256: string }>; ledger: unknown[] }
/** Preserva todas as colunas históricas, não apenas campos selecionados da nota. */
async function snapshot(db: Knex, original?: Snapshot): Promise<Snapshot> {
  const nomes = original ? Object.keys(original.tabelas) : (await db("pg_tables").where({ schemaname: "piv" }).select("tablename").orderBy("tablename")).map((t) => String(t.tablename));
  const tabelas: Snapshot["tabelas"] = {};
  for (const tabela of nomes) {
    const colunas = original?.tabelas[tabela].colunas ?? (await db("information_schema.columns")
      .where({ table_schema: "piv", table_name: tabela }).select("column_name").orderBy("ordinal_position")).map((c) => String(c.column_name));
    const linhas: unknown[] = [];
    for (let deslocamento = 0; ; deslocamento += 100) {
      const pagina = await db(`piv.${tabela}`).select(colunas).orderBy(colunas.includes("id") ? "id" : colunas[0]).limit(100).offset(deslocamento);
      linhas.push(...pagina);
      if (pagina.length < 100) break;
    }
    tabelas[tabela] = { colunas, quantidade: linhas.length, sha256: createHash("sha256").update(JSON.stringify(linhas)).digest("hex") };
  }
  return { tabelas, ledger: await db("public.knex_migrations").select("*").orderBy("id") };
}
async function conferirHistorico(db: Knex, original: Snapshot) {
  const atual = await snapshot(db, original);
  expect(atual.tabelas).toEqual(original.tabelas);
  expect(atual.ledger.filter((m: any) => !NOVAS.includes(m.name))).toEqual(original.ledger);
}
async function conferirIds(db: Knex, f: Historico) {
  const ids = async (tabela: string, esperados: string[]) => expect((await db(`piv.${tabela}`).whereIn("id", esperados).pluck("id")).sort()).toEqual([...esperados].sort());
  await ids("avaliacao", f.avaliacoes.map((a) => a.id));
  await ids("nota", f.notaIds); await ids("nota_auditoria", f.auditoriaIds); await ids("nota_autorizacao_excepcional", f.autorizacaoIds);
}
async function replay(db: Knex, f: Historico) {
  const avaliacoes = await db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId });
  const notas = await db("piv.nota").where({ matricula_turma_disciplina_id: f.matriculaDisciplinaId });
  return calcularBoletim(avaliacoes.map((a) => ({ id: a.id, tipo: a.tipo_avaliacao, descricao: a.descricao_avaliacao, valor: Number(a.valor) })),
    new Map(notas.map((n) => [String(n.avaliacao_id), Number(n.valor)])));
}
async function guardsAtivos(db: Knex) {
  const { rows } = await db.raw("SELECT tgname FROM pg_trigger WHERE tgrelid IN ('piv.avaliacao'::regclass,'piv.nota'::regclass,'piv.nota_auditoria'::regclass) AND NOT tgisinternal AND tgenabled <> 'D' ORDER BY tgname");
  expect(rows.length).toBeGreaterThanOrEqual(3);
  return rows;
}

describe("T078 adoção e retorno histórico no PostgreSQL exclusivo @int", () => {
  it.each(["completo", "incompleto", "zero", "ausente", "recuperacao"] as const)("adota %s conservando registros integrais, IDs, tipos e resultado por nota", async (modelo) => {
    const { db, fixture } = await preparar(modelo);
    const antes = await snapshot(db);
    const resultado = await replay(db, fixture);
    const avAntes = await db("piv.avaliacao").where({ turma_disciplina_id: fixture.ofertaId });
    const notasAntes = await db("piv.nota").whereIn("id", fixture.notaIds);
    const inicioAdocao = new Date((await db.raw("SELECT clock_timestamp() AS momento")).rows[0].momento).getTime();
    await adotar(db);
    const fimAdocao = new Date((await db.raw("SELECT clock_timestamp() AS momento")).rows[0].momento).getTime();
    const marcadorTecnico = (momento: unknown) => {
      const tempo = new Date(momento as string).getTime();
      expect(tempo).toBeGreaterThanOrEqual(inicioAdocao);
      expect(tempo).toBeLessThanOrEqual(fimAdocao);
    };
    await conferirHistorico(db, antes); await conferirIds(db, fixture);
    expect(await replay(db, fixture)).toEqual(resultado);
    const [regra] = await db("piv.regra_pontuacao").where({ curso_id: fixture.cursoId, periodo_letivo_id: fixture.periodoId });
    expect(regra).toMatchObject({ total_pontos: "100.00", origem: "HISTORICA", criada_por_usuario_id: null, atualizada_por_usuario_id: null });
    const subgrupos = await db("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: regra.id }).orderBy("ordem");
    expect(subgrupos.map((s) => [s.nome, s.orcamento_pontos, s.modo_quantidade, s.quantidade_fixa])).toEqual([
      ["Provas", "60.00", "FIXA", 3], ["TPI", "5.00", "FIXA", 1], ["Trabalhos", "35.00", "SEM_LIMITE", null],
    ]);
    const oferta = await db("piv.turma_disciplina").where({ id: fixture.ofertaId }).first();
    expect(oferta.regra_pontuacao_id).toBe(regra.id);
    expect(oferta.pontuacao_vinculada_em).not.toBeNull(); expect(regra.usada_em).not.toBeNull();
    // Metadados antigos e auditoria disponível não comprovam o histórico completo.
    // Marcadores assumem explicitamente origem técnica no instante da adoção.
    marcadorTecnico(oferta.pontuacao_vinculada_em); marcadorTecnico(regra.usada_em);
    const novas = await db("piv.avaliacao").whereIn("id", avAntes.map((a) => a.id));
    for (const avaliacao of novas) {
      const anterior = avAntes.find((a) => a.id === avaliacao.id)!;
      expect(avaliacao.tipo_avaliacao).toBe(anterior.tipo_avaliacao);
      const grupo = subgrupos.find((s) => s.nome === ({ PROVA: "Provas", TPI: "TPI", TRABALHO: "Trabalhos" } as Record<string, string>)[anterior.tipo_avaliacao]);
      expect(avaliacao.subgrupo_id).toBe(anterior.tipo_avaliacao === "RECUPERACAO" ? null : grupo?.id);
      const recebeuNota = notasAntes.some((n) => n.avaliacao_id === avaliacao.id);
      expect(avaliacao.primeira_nota_em === null).toBe(!recebeuNota);
      if (recebeuNota) marcadorTecnico(avaliacao.primeira_nota_em);
    }
    const eventos = await db("piv.regra_pontuacao_auditoria").where({ regra_pontuacao_id: regra.id });
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ acao: "ADOCAO_HISTORICA", usuario_id: null });
    expect(["professor", "secretaria", "administrador", "aluno"]).not.toContain(String(eventos[0].perfil).toLowerCase());
    expect(eventos[0].novo).toMatchObject({ origemTemporal: "ADOCAO_TECNICA" });
    await guardsAtivos(db);
    // Um par sem avaliações anteriores continua sem regra default institucional.
    const semHistorico = await db("piv.turma_disciplina as td").join("piv.turma as t", "t.id", "td.turma_id")
      .where("td.id", fixture.ofertaSemHistoricoId).first("td.regra_pontuacao_id", "t.curso_id", "t.periodo_letivo_id");
    expect(semHistorico.regra_pontuacao_id).toBeNull();
    if (semHistorico.curso_id !== fixture.cursoId || semHistorico.periodo_letivo_id !== fixture.periodoId) {
      expect(await db("piv.regra_pontuacao").where({ curso_id: semHistorico.curso_id, periodo_letivo_id: semHistorico.periodo_letivo_id })).toEqual([]);
    }
    // Nenhuma segunda adoção duplica regras/eventos ou altera o histórico original.
    const representacao = await snapshot(db);
    await adotar(db); expect(await snapshot(db)).toEqual(representacao);
  });

  it.each(["cinco_provas20", "regular50_rec80_retificado70"] as const)("bloqueia adoção de %s sem corrigir ou perder nenhum registro", async (modelo) => {
    const { db, fixture } = await preparar(modelo);
    const apta = await criarHistorico(db, "completo");
    const antes = await snapshot(db);
    if (modelo === "regular50_rec80_retificado70") expect(await replay(db, fixture)).toMatchObject({ mediaFinal: 70, notaRecuperacao: 80 });
    await expect(adotar(db)).rejects.toThrow(/incompat|diverg/i);
    await conferirHistorico(db, antes); await conferirIds(db, fixture); await conferirIds(db, apta);
    if (await db.schema.withSchema("piv").hasTable("regra_pontuacao")) {
      expect(await db("piv.regra_pontuacao")).toEqual([]);
      expect(await db("piv.regra_pontuacao_auditoria")).toEqual([]);
    }
  });

  it.each(["completo", "incompleto", "zero", "ausente", "recuperacao"] as const)("retorna %s antes de escritas dinâmicas, preservando histórico e13 migrations antigas", async (modelo) => {
    const { db, fixture } = await preparar(modelo);
    const antes = await snapshot(db); const resultado = await replay(db, fixture);
    await adotar(db); await executarRetorno(db);
    expect(await snapshot(db)).toEqual(antes); await conferirIds(db, fixture);
    expect(await replay(db, fixture)).toEqual(resultado);
    expect(await db.schema.withSchema("piv").hasTable("regra_pontuacao")).toBe(false);
    const escala = await db("information_schema.columns").where({ table_schema: "piv", table_name: "nota", column_name: "valor" }).first("numeric_precision", "numeric_scale");
    expect(escala).toEqual({ numeric_precision: 6, numeric_scale: 2 });
  });

  it("recusa retorno após REGULAR novo, preservando schema, dados, ledger e guards", async () => {
    const { db, fixture } = await preparar("incompleto"); await adotar(db);
    const oferta = await db("piv.turma_disciplina").where({ id: fixture.ofertaId }).first();
    const grupo = await db("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: oferta.regra_pontuacao_id, nome: "Provas" }).first();
    const id = randomUUID();
    await db("piv.avaliacao").insert({ id, turma_disciplina_id: fixture.ofertaId, subgrupo_id: grupo.id,
      tipo_avaliacao: "REGULAR", descricao_avaliacao: "Escrita dinâmica sintética após adoção", valor: "20.00", data_lancamento: "2026-09-28", data_devolucao: "2026-10-01" });
    const antes = await snapshot(db); const guards = await guardsAtivos(db);
    await expect(executarRetorno(db)).rejects.toMatchObject({ codigo: "RETORNO_INCOMPATIVEL" });
    expect(await snapshot(db)).toEqual(antes); expect(await guardsAtivos(db)).toEqual(guards);
    expect((await db("piv.avaliacao").where({ id }).first()).tipo_avaliacao).toBe("REGULAR");
  });

  it("recusa retorno após configuração120 em período seguinte sem remover regra histórica", async () => {
    const { db, fixture } = await preparar("completo"); await adotar(db);
    const periodo = await db("piv.periodo_letivo").where({ id: fixture.periodoId }).first();
    const periodoId = randomUUID(); const regraId = randomUUID(); const ano = Number(periodo.ano) + 2;
    await db.transaction(async (trx) => {
      await trx("piv.periodo_letivo").insert({ id: periodoId, codigo: periodoId, ano, semestre: 1, data_inicio: `${ano}-01-01`, data_fim: `${ano}-06-30`, ativo: true, status: "em_andamento" });
      await trx("piv.regra_pontuacao").insert({ id: regraId, curso_id: fixture.cursoId, periodo_letivo_id: periodoId, total_pontos: "120.00", origem: "CONFIGURADA",
        criada_por_usuario_id: fixture.usuarioId, atualizada_por_usuario_id: fixture.usuarioId });
      await trx("piv.subgrupo_avaliacao").insert({ regra_pontuacao_id: regraId, nome: "Novo plano", orcamento_pontos: "120.00", modo_quantidade: "SEM_LIMITE", quantidade_fixa: null, ordem: 0 });
    });
    const antes = await snapshot(db); const guards = await guardsAtivos(db);
    await expect(executarRetorno(db)).rejects.toMatchObject({ codigo: "RETORNO_INCOMPATIVEL" });
    expect(await snapshot(db)).toEqual(antes); expect(await guardsAtivos(db)).toEqual(guards);
  });

  it("retificação50→70 após REC80 bloqueia retorno mesmo com tipos e precisão compatíveis", async () => {
    const { db, fixture } = await preparar("recuperacao"); await adotar(db);
    expect(await replay(db, fixture)).toMatchObject({ pontosObtidos: 50, notaRecuperacao: 80, mediaFinal: 80 });
    await db.transaction(async (trx) => {
      const regulares = await trx("piv.nota as n").join("piv.avaliacao as a", "a.id", "n.avaliacao_id")
        .where("n.matricula_turma_disciplina_id", fixture.matriculaDisciplinaId).whereNot("a.tipo_avaliacao", "RECUPERACAO")
        .select("n.id", "n.valor", "a.valor as maximo").orderBy("n.id");
      let incremento = 2000;
      for (const n of regulares) {
        const anterior = Math.round(Number(n.valor) * 100); const espaco = Math.round(Number(n.maximo) * 100) - anterior;
        const acrescimo = Math.min(espaco, incremento); if (acrescimo <= 0) continue;
        const novo = ((anterior + acrescimo) / 100).toFixed(2);
        await trx("piv.nota").where({ id: n.id }).update({ valor: novo, atualizada_por_usuario_id: fixture.usuarioId });
        await trx("piv.nota_auditoria").insert({ nota_id: n.id, usuario_id: fixture.usuarioId, perfil: "secretaria", acao: "RETIFICACAO", valor_anterior: n.valor, valor_novo: novo, motivo: "Retificação sintética documentada", criado_em: trx.raw("clock_timestamp()") });
        incremento -= acrescimo;
      }
      expect(incremento).toBe(0);
    });
    expect(await replay(db, fixture)).toMatchObject({ pontosObtidos: 70, notaRecuperacao: 80, mediaFinal: 70 });
    const antes = await snapshot(db); const guards = await guardsAtivos(db);
    await expect(executarRetorno(db)).rejects.toMatchObject({ codigo: "RETORNO_INCOMPATIVEL" });
    expect(await snapshot(db)).toEqual(antes); expect(await guardsAtivos(db)).toEqual(guards);
  });

  it("desfaz também os downs003/002 se uma dependência impedir o último down001", async () => {
    const { db, fixture } = await preparar("completo"); await adotar(db);
    await db.raw("CREATE VIEW piv.dependencia_sintetica_retorno AS SELECT id,subgrupo_id FROM piv.avaliacao");
    const antes = await snapshot(db); const guards = await guardsAtivos(db);
    const consultas: string[] = []; const observar = (q: any) => consultas.push(q.sql);
    db.on("query", observar);
    try { await expect(executarRetorno(db)).rejects.toMatchObject({ codigo: "RETORNO_INCOMPATIVEL" }); }
    finally { db.off("query", observar); }
    expect(consultas.join("\n")).toMatch(/DROP TRIGGER pontuacao_guard_regra/i);
    expect(consultas.join("\n")).toMatch(/delete from "piv"\."regra_pontuacao"/i);
    expect(consultas.join("\n")).toMatch(/ALTER TABLE piv\.avaliacao DROP COLUMN primeira_nota_em/i);
    expect(await snapshot(db)).toEqual(antes); expect(await guardsAtivos(db)).toEqual(guards);
    await conferirIds(db, fixture);
    expect(await db("pg_views").where({ schemaname: "piv", viewname: "dependencia_sintetica_retorno" })).toHaveLength(1);
    expect((await db("piv.avaliacao").where({ id: fixture.avaliacoes[0].id }).first()).subgrupo_id).not.toBeNull();
  });
});
