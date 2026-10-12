import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { startPgIntegration, type PgIntegration } from "../../src/test-helpers/pgIntegration";
import { calcularBoletim, type AvaliacaoResumo } from "./calculo-legado";

type Modelo = "completo" | "incompleto" | "zero" | "ausente" | "recuperacao"
  | "cinco_provas20" | "regular50_rec80_retificado70" | "matriz_curso_divergente"
  | "nota_oferta_divergente" | "duas_tpi5" | "trabalhos36" | "nota_acima_maximo";
interface Historico {
  cursoId: string; periodoId: string; ofertaId: string; matriculaId: string; matriculaDisciplinaId: string; usuarioId: string;
  outraOfertaId: string; ofertaSemHistoricoId: string;
  avaliacoes: Array<{ id: string; tipo: AvaliacaoResumo["tipo"]; valor: string }>;
  notaIds: string[]; auditoriaIds: string[]; autorizacaoIds: string[];
}
interface Relatorio {
  apto: boolean;
  divergencias: Array<{ codigo: string; ofertaId?: string; matriculaTurmaDisciplinaId?: string; campo?: string }>;
  manifesto: {
    referenciaCodigo: string; versaoPostgres: string; geradoEm: string; snapshot: string;
    migrations: Array<{ nome: string; batch: number }>;
    constraints: Array<{ tabela: string; nome: string; definicao: string }>;
    indices: Array<{ tabela: string; nome: string; definicao: string }>;
    registros: Array<{ tabela: string; quantidade: number; sha256: string }>;
  };
}
type CriarHistorico = (db: Knex, modelo: Modelo) => Promise<Historico>;
type Preflight = (db: Knex, opcoes: { referenciaCodigo: string }) => Promise<Relatorio>;
const REFERENCIA = "27be0d9c5306eda581d3aacffa1028b2671424b5";
let criarHistorico: CriarHistorico;
let gerarPreflight: Preflight;
let pg: PgIntegration | undefined;

// T077 precede T079/T080. Imports diferidos coletam os casos e mantêm tsc íntegro
// enquanto os módulos futuros não existem. Ausência é RED de setup, sem asserções.
beforeAll(async () => {
  const caminhoFixture = "../../src/test-helpers/historicoPontuacao.ts";
  const caminhoPreflight = "./preflight.ts";
  const fixture = await import(caminhoFixture);
  const preflight = await import(caminhoPreflight);
  if (typeof fixture.criarHistoricoPontuacao !== "function" || typeof preflight.gerarPreflight !== "function") {
    throw new Error("T079/T080 pendentes: exports do histórico/preflight não disponíveis.");
  }
  criarHistorico = fixture.criarHistoricoPontuacao;
  gerarPreflight = preflight.gerarPreflight;
});
afterEach(async () => { try { await pg?.stop(); } finally { pg = undefined; } });

async function preparar(modelo: Modelo, expandida = false) {
  pg = await startPgIntegration(expandida ? { fronteiraExpandida: true } : { fronteiraHistorica: true });
  const ledger = await pg.db("public.knex_migrations").select("name").orderBy("name");
  expect(ledger).toHaveLength(expandida ? 14 : 13);
  expect(ledger.some((r) => String(r.name).includes("adota_pontuacao_historica"))).toBe(false);
  expect(await pg.db.schema.withSchema("piv").hasTable("regra_pontuacao")).toBe(expandida);
  return { db: pg.db, fixture: await criarHistorico(pg.db, modelo) };
}

/** Conjunto integral, paginado e ordenado; somente hashes/contagens chegam às assertivas. */
async function snapshot(db: Knex) {
  const tabelas = await db("pg_tables").where({ schemaname: "piv" }).select("tablename").orderBy("tablename");
  const dados: Record<string, { quantidade: number; sha256: string }> = {};
  for (const { tablename } of tabelas) {
    const colunas = await db("information_schema.columns").where({ table_schema: "piv", table_name: tablename })
      .select("column_name").orderBy("ordinal_position");
    const nomes = colunas.map((c) => String(c.column_name));
    const linhas: unknown[] = [];
    for (let deslocamento = 0; ; deslocamento += 100) {
      const pagina = await db(`piv.${tablename}`).select(nomes).orderBy(nomes.includes("id") ? "id" : nomes[0])
        .limit(100).offset(deslocamento);
      linhas.push(...pagina);
      if (pagina.length < 100) break;
    }
    dados[tablename] = { quantidade: linhas.length, sha256: createHash("sha256").update(JSON.stringify(linhas)).digest("hex") };
  }
  const migrations = await db("public.knex_migrations").select("*").orderBy("id");
  return { dados, migrations };
}

async function conferirSemEscrita(db: Knex) {
  const antes = await snapshot(db);
  const consultas: Array<{ sql: string; __knexTxId?: string }> = [];
  const observar = (q: { sql: string; __knexTxId?: string }) => consultas.push(q);
  db.on("query", observar);
  let relatorio: Relatorio;
  try { relatorio = await gerarPreflight(db, { referenciaCodigo: REFERENCIA }); }
  finally { db.removeListener("query", observar); }
  expect(await snapshot(db)).toEqual(antes);
  const sql = consultas.map((q) => q.sql).join("\n");
  expect(sql).toMatch(/repeatable\s+read/i);
  expect(sql).toMatch(/read\s+only/i);
  expect(sql).not.toMatch(/\b(insert\s+into|delete\s+from|update\s+(?:piv\.|\"piv\")|alter\s+table|drop\s+table|truncate|for\s+update|lock\s+table)\b/i);
  const transacoes = new Set(consultas.filter((q) => /^\s*(select|with|show)\b/i.test(q.sql)).map((q) => q.__knexTxId));
  expect(transacoes.size).toBe(1);
  expect([...transacoes][0]).toBeTruthy();
  return { relatorio, antes };
}

async function replayLegado(db: Knex, f: Historico) {
  const avaliacoes = await db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId }).orderBy("id");
  const notas = await db("piv.nota").where({ matricula_turma_disciplina_id: f.matriculaDisciplinaId });
  return calcularBoletim(avaliacoes.map((a) => ({ id: a.id, tipo: a.tipo_avaliacao, descricao: a.descricao_avaliacao, valor: Number(a.valor) })),
    new Map(notas.map((n) => [String(n.avaliacao_id), Number(n.valor)])));
}

describe("T077 preflight histórico somente leitura @int", () => {
  it.each(["completo", "incompleto", "zero", "ausente", "recuperacao"] as const)("aceita %s sem saneamento nem confundir ausência com zero", async (modelo) => {
    const { db, fixture } = await preparar(modelo);
    const legado = await replayLegado(db, fixture);
    if (modelo === "incompleto") expect(legado.etapaRegularCompleta).toBe(false);
    if (modelo === "zero") expect(legado).toMatchObject({ pontosObtidos: 0, etapaRegularCompleta: true, elegivelRecuperacao: true });
    if (modelo === "ausente") expect(legado).toMatchObject({ mediaParcial: null, etapaRegularCompleta: false, elegivelRecuperacao: false });
    if (modelo === "recuperacao") expect(legado).toMatchObject({ etapaRegularCompleta: true, elegivelRecuperacao: true, notaRecuperacao: 80, mediaFinal: 80 });
    const { relatorio } = await conferirSemEscrita(db);
    expect(relatorio.apto).toBe(true);
    expect(relatorio.divergencias).toEqual([]);
  });

  it("manifesta PostgreSQL/schema realmente instalados, snapshot, hashes e referência, sem PII ou segredos", async () => {
    const { db, fixture } = await preparar("completo");
    const { relatorio, antes } = await conferirSemEscrita(db);
    const versao = await db.raw("SHOW server_version");
    expect(relatorio.manifesto).toMatchObject({ referenciaCodigo: REFERENCIA, versaoPostgres: String(versao.rows[0].server_version) });
    expect(Number.isNaN(Date.parse(relatorio.manifesto.geradoEm))).toBe(false);
    expect(relatorio.manifesto.snapshot).toEqual(expect.any(String));
    expect(relatorio.manifesto.snapshot.length).toBeGreaterThan(0);
    expect(relatorio.manifesto.migrations.map((m) => m.nome).sort()).toEqual(antes.migrations.map((m) => String(m.name)).sort());
    const constraints = await db.raw("SELECT c.conname AS nome FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='piv'");
    expect(new Set(relatorio.manifesto.constraints.map((c) => c.nome))).toEqual(new Set(constraints.rows.map((c: { nome: string }) => c.nome)));
    const indices = await db("pg_indexes").where({ schemaname: "piv" }).select("indexname");
    expect(relatorio.manifesto.indices.map((i) => i.nome).sort()).toEqual(indices.map((i) => String(i.indexname)).sort());
    for (const tabela of ["avaliacao", "nota", "nota_auditoria", "nota_autorizacao_excepcional", "turma_disciplina", "matricula_turma_disciplina"]) {
      expect(relatorio.manifesto.registros).toContainEqual(expect.objectContaining({ tabela, quantidade: antes.dados[tabela].quantidade, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    }
    const segundo = await gerarPreflight(db, { referenciaCodigo: REFERENCIA });
    expect(segundo.manifesto.registros).toEqual(relatorio.manifesto.registros);
    const pessoa = await db("piv.usuario").where({ id: fixture.usuarioId }).first("nome", "email", "senha");
    const motivos = await db("piv.nota_autorizacao_excepcional").whereIn("id", fixture.autorizacaoIds).pluck("motivo");
    const serializado = JSON.stringify(relatorio);
    for (const dado of [pessoa.nome, pessoa.email, pessoa.senha, ...motivos].filter((v) => typeof v === "string" && v.length > 4)) expect(serializado).not.toContain(dado);
    expect(serializado).not.toMatch(/postgres(?:ql)?:\/\/|DATABASE_URL|JWT_SECRET/);
  });

  it.each(["cinco_provas20", "duas_tpi5", "trabalhos36", "nota_acima_maximo", "matriz_curso_divergente", "nota_oferta_divergente"] as const)(
    "bloqueia %s e conserva todos os IDs, vínculos e auditorias", async (modelo) => {
      const { db, fixture } = await preparar(modelo);
      const { relatorio } = await conferirSemEscrita(db);
      expect(relatorio.apto).toBe(false);
      expect(relatorio.divergencias).toEqual(expect.arrayContaining([expect.objectContaining({ ofertaId: fixture.ofertaId, codigo: expect.any(String) })]));
    },
  );

  it("detecta regular50→REC80→retificação70 pelo resultado numérico, apesar de ambas as situações serem APROVADO", async () => {
    const { db, fixture } = await preparar("regular50_rec80_retificado70");
    expect(await replayLegado(db, fixture)).toMatchObject({ pontosObtidos: 70, notaRecuperacao: 80, mediaFinal: 70, situacao: "APROVADO", etapaRegularCompleta: true, elegivelRecuperacao: false });
    // O replay novo deve detectar a projeção80; o legado acima retorna70.
    const { relatorio } = await conferirSemEscrita(db);
    expect(relatorio.apto).toBe(false);
    expect(relatorio.divergencias).toContainEqual(expect.objectContaining({ ofertaId: fixture.ofertaId, codigo: "RESULTADO_HISTORICO_DIVERGENTE" }));
  });

  it("aceita centavos .01/.29 em máximos e notas pelo output arredondado do replay real", async () => {
    const { db, fixture } = await preparar("completo");
    const trabalho = fixture.avaliacoes.find((a) => a.tipo === "TRABALHO")!;
    await db("piv.avaliacao").where({ id: trabalho.id }).update({ valor: "34.70" });
    for (const valor of ["0.01", "0.29"]) {
      const avaliacaoId = randomUUID();
      await db("piv.avaliacao").insert({ id: avaliacaoId, turma_disciplina_id: fixture.ofertaId,
        tipo_avaliacao: "TRABALHO", valor, descricao_avaliacao: "Centavos sintéticos", data_lancamento: "2026-01-10" });
      await db("piv.nota").insert({ avaliacao_id: avaliacaoId, matricula_turma_disciplina_id: fixture.matriculaDisciplinaId,
        valor, criada_por_usuario_id: fixture.usuarioId, atualizada_por_usuario_id: fixture.usuarioId,
        publicada_em: "2026-01-20T10:00:00Z" });
    }
    expect(await replayLegado(db, fixture)).toMatchObject({ pontosObtidos: 80.30, pontosMaximos: 100,
      mediaFinal: 80.30, etapaRegularCompleta: true });
    const { relatorio } = await conferirSemEscrita(db);
    expect(relatorio.apto).toBe(true);
    expect(relatorio.divergencias).toEqual([]);
  });

  it("uma oferta incompatível bloqueia o conjunto, sem omiti-la ou adotar parcialmente a outra", async () => {
    const { db, fixture: apta } = await preparar("completo");
    const invalida = await criarHistorico(db, "cinco_provas20");
    const { relatorio } = await conferirSemEscrita(db);
    expect(relatorio.apto).toBe(false);
    expect(relatorio.divergencias.some((d) => d.ofertaId === invalida.ofertaId)).toBe(true);
    expect(await db("piv.avaliacao").where({ turma_disciplina_id: apta.ofertaId }).pluck("id")).toEqual(expect.arrayContaining(apta.avaliacoes.map((a) => a.id)));
    expect(await db.schema.withSchema("piv").hasTable("regra_pontuacao")).toBe(false);
  });

  it("inclui matrícula concluída, vínculo aprovado e oferta inativa na análise histórica integral", async () => {
    const { db, fixture } = await preparar("completo");
    await db("piv.matricula").where({ id: fixture.matriculaId }).update({ status: "concluida" });
    await db("piv.matricula_turma_disciplina").where({ id: fixture.matriculaDisciplinaId }).update({ status: "aprovada" });
    await db("piv.turma_disciplina").where({ id: fixture.ofertaId }).update({ status: "inativa" });
    expect(await replayLegado(db, fixture)).toMatchObject({ pontosObtidos: 80, mediaFinal: 80, etapaRegularCompleta: true });
    const { relatorio } = await conferirSemEscrita(db);
    expect(relatorio.apto).toBe(true); expect(relatorio.divergencias).toEqual([]);
    // Uma incompatibilidade posterior no mesmo histórico também deve ser encontrada.
    const provas = fixture.avaliacoes.filter((a) => a.tipo === "PROVA");
    for (let i = 0; i < 2; i++) await db("piv.avaliacao").insert({ turma_disciplina_id: fixture.ofertaId, tipo_avaliacao: "PROVA", valor: "20.00", descricao_avaliacao: "Excesso sintético" });
    const invalido = await gerarPreflight(db, { referenciaCodigo: REFERENCIA });
    expect(invalido.divergencias).toContainEqual(expect.objectContaining({ ofertaId: fixture.ofertaId, codigo: "PLANO_HISTORICO_INCOMPATIVEL" }));
    expect(provas).toHaveLength(3);
  });

  // Fronteira expandida sem adoção/guards novos, exclusivamente sintética.
  // Não é uma escrita produtiva aceita, nem restaura precisão já arredondada no legado.
  it.each([
    ["nota", "valor", "1.001"], ["nota", "valor", "NaN"], ["nota", "valor", "Infinity"],
    ["nota_auditoria", "valor_anterior", "1.000"], ["nota_auditoria", "valor_novo", "-0.01"],
    ["nota_auditoria", "valor_novo", "-Infinity"],
  ] as const)("bloqueia %s.%s=%s na fronteira expandida, sem arredondar ou sanear", async (tabela, campo, valor) => {
    const { db, fixture } = await preparar("completo", true);
    const id = tabela === "nota" ? fixture.notaIds[0] : fixture.auditoriaIds[0];
    expect(id).toBeTruthy();
    await db(`piv.${tabela}`).where({ id }).update({ [campo]: valor });
    expect((await db(`piv.${tabela}`).where({ id }).first())[campo]).toBe(valor);
    const { relatorio } = await conferirSemEscrita(db);
    expect(relatorio.apto).toBe(false);
    expect(relatorio.divergencias.length).toBeGreaterThan(0);
  });

  it("FKs e recuperação única100 são inventariadas e continuam rejeitando órfãos/duplicação física", async () => {
    const { db, fixture } = await preparar("recuperacao");
    const antes = await snapshot(db);
    const tentativa = (operacao: (trx: Knex.Transaction) => Promise<unknown>) => db.transaction(operacao);
    await expect(tentativa((trx) => trx("piv.nota").insert({ avaliacao_id: randomUUID(), matricula_turma_disciplina_id: fixture.matriculaDisciplinaId, valor: "0.00" }))).rejects.toMatchObject({ code: "23503" });
    await expect(tentativa((trx) => trx("piv.avaliacao").insert({ turma_disciplina_id: fixture.ofertaId, tipo_avaliacao: "RECUPERACAO", valor: "100.00" }))).rejects.toMatchObject({ code: "23505" });
    await expect(tentativa((trx) => trx("piv.avaliacao").insert({ turma_disciplina_id: fixture.ofertaSemHistoricoId, tipo_avaliacao: "RECUPERACAO", valor: "99.00" }))).rejects.toMatchObject({ code: "23514" });
    expect(await snapshot(db)).toEqual(antes);
    const { relatorio } = await conferirSemEscrita(db);
    expect(relatorio.manifesto.indices.some((i) => /recuperacao/i.test(i.definicao) && /unique/i.test(i.definicao))).toBe(true);
    expect(relatorio.manifesto.constraints.some((c) => /foreign key/i.test(c.definicao))).toBe(true);
  });
});
