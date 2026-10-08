import { randomUUID, createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { performance } from "node:perf_hooks";
import type { Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { criarPontuacaoFixture, criarAvaliacaoPontuacao, criarNotaPontuacao, type PontuacaoFixture } from "../../test-helpers/pontuacaoFixture";
import { disputarComBloqueioAcademico } from "../../test-helpers/disputaAcademica";
import type { ResultadoAcademicoService } from "./service/ResultadoAcademicoService";
import type { FichaService as TipoFichaService } from "../modulo-ficha/service/FichaService";
import type { NotaRepository as TipoNotaRepository } from "./repository/NotaRepository";
import type { NotaService as TipoNotaService } from "./service/NotaService";

// A suíte comum valida comportamento/consultas/locks, sem sobrescrever a evidência.
const capturar = process.env.CAPTURAR_METRICAS_ACADEMICAS === "true";
const fase = process.env.FASE_MEDICAO_T091 ?? "depois";
const amostras = 10;
const aquecimentos = 2;
const destinoJson = path.resolve(__dirname, "../../../metricas/t091-2026-09-28.json");
let pg: PgIntegration;
let bancoGlobal: Knex;
let FichaService: typeof TipoFichaService;
let NotaRepository: typeof TipoNotaRepository;
let NotaService: typeof TipoNotaService;
let criarResultado: (repository: TipoNotaRepository) => ResultadoAcademicoService;
let versaoPg: string;
const medidas: Record<string, unknown> = {};
const request = (id: string, perfil = "secretaria") => ({ user: { id, tipo_usuario: perfil } }) as any;

beforeAll(async () => {
  if (!["antes", "depois"].includes(fase) || (fase === "antes" && !capturar)) {
    throw new Error("A medição anterior exige captura nominal explícita; selecione antes/depois.");
  }
  pg = await startPgIntegration();
  ({ NotaRepository } = await import("./repository/NotaRepository"));
  ({ NotaService } = await import("./service/NotaService"));
  ({ FichaService } = await import("../modulo-ficha/service/FichaService"));
  ({ criarResultadoAcademicoService: criarResultado } = await import("./service/criarResultadoAcademicoService"));
  ({ db: bancoGlobal } = await import("../../database/connection"));
  versaoPg = (await pg.db.raw("SHOW server_version")).rows[0].server_version;
  expect(await pg.db("knex_migrations").count("* as quantidade").first()).toMatchObject({ quantidade: "16" });
}, 180_000);

afterAll(async () => {
  try { await bancoGlobal?.destroy(); } finally { await pg?.stop(); }
  if (!capturar || !medidas.leituras || (fase === "depois" && !medidas.escritas)) return;
  const fontes = await Promise.all(["../modulo-ficha/service/FichaService.ts", "desempenhoAcademico.int.test.ts"]
    .map(async (nome) => ({ arquivo: path.basename(nome), sha256: createHash("sha256")
      .update(await readFile(path.resolve(__dirname, nome))).digest("hex") })));
  const execucao = { capturadaEm: new Date().toISOString(), fase,
    fontes,
    runtime: { node: process.version, plataforma: process.platform, arquitetura: process.arch, cpus: os.cpus().length,
      postgres: versaoPg, poolMaximo: pg.db.client.config.pool?.max ?? 10 },
    condicoes: { migrations: 16, banco: "PostgreSQL15 efêmero próprio; loopback e sufixo _test validados",
      amostras, aquecimentos, tempo: "performance.now em milissegundos; aquecimentos excluídos de mediana/p95",
      p95: "nearest-rank, ceil(0.95*N)", recursosEncerrados: true,
      consultas: "eventos Knex enviados ao servidor; domínio separado de BEGIN/COMMIT/SET e instrumentação",
      limites: ["Dataset sintético de 1/20 ofertas e matrículas; sem SLO nem inferência de volume de produção",
        "Caches quentes após aquecimento; máquina compartilhada, sem isolamento de CPU/IO",
        "A Ficha usa o snapshot do resultado comum e leituras institucionais subsequentes, como antes",
        "Escritas medidas incluem espera artificial e observação concorrente explicitamente separadas; dados preexistentes com primeiro uso já marcado",
        "pg_stat_activity/pg_locks são amostras pontuais; ausência observada não constitui garantia geral de ausência de contenção"] },
    ...medidas };
  let anterior: unknown;
  if (fase === "depois") {
    const salvo = JSON.parse(await readFile(destinoJson, "utf8"));
    if (salvo.protocolo !== "T091-v1" || !salvo.antes) throw new Error("Baseline nominal T091 ausente/incompatível.");
    anterior = salvo.antes;
  }
  await mkdir(path.dirname(destinoJson), { recursive: true });
  await writeFile(destinoJson, JSON.stringify({ protocolo: "T091-v1", ...(fase === "antes"
    ? { antes: execucao } : { antes: anterior, depois: execucao }) }, null, 2) + "\n");
});

interface Consulta { sql: string; trx?: string }
function categoria(sql: string): "dominio" | "controle" | "instrumentacao" {
  if (/pg_stat_activity|pg_locks|pg_blocking_pids|pg_backend_pid|set_config|T091_OBSERVADOR/i.test(sql)) return "instrumentacao";
  return /^\s*(select|with|insert|update|delete)\b/i.test(sql) ? "dominio" : "controle";
}
function contar(queries: Consulta[]) {
  const total = { dominio: 0, controle: 0, instrumentacao: 0 };
  for (const q of queries) total[categoria(q.sql)]++;
  return total;
}
async function observar<T>(operacao: () => Promise<T>) {
  const queries: Consulta[] = [];
  const registrar = (q: any) => queries.push({ sql: q.sql, trx: q.__knexTxId });
  pg.db.on("query", registrar); bancoGlobal.on("query", registrar);
  const inicio = performance.now();
  try { const resultado = await operacao(); return { resultado, ms: performance.now() - inicio, queries, consultas: contar(queries) }; }
  finally { pg.db.off("query", registrar); bancoGlobal.off("query", registrar); }
}
function resumir(valores: number[]) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return { medianaMs: ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2,
    p95Ms: ordenados[Math.ceil(0.95 * ordenados.length) - 1] };
}

interface LinhaDataset { fixture: PontuacaoFixture; avaliacaoId: string; indice: number }
async function dataset(quantidade: number, historico = true) {
  const f = await criarPontuacaoFixture(pg.db, { totalPontos: "120.00", subgrupos: [
    { nome: "Regular", orcamento_pontos: "120.00", modo_quantidade: "FIXA", quantidade_fixa: 1 },
  ] });
  // Remove somente os dois registros sem história desta fixture, para cardinalidade exata.
  await pg.db("piv.matricula_turma_disciplina").where({ id: f.outraMatriculaDisciplinaId }).delete();
  await pg.db("piv.matricula").where({ id: f.outraMatriculaId }).delete();
  const oferta = await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first();
  const turma = await pg.db("piv.turma").where({ id: f.turmaId }).first();
  const linhas: LinhaDataset[] = [];
  const localId = randomUUID();
  await pg.db("piv.local").insert({ id: localId, codigo: localId });
  for (let i = 0; i < quantidade; i++) {
    const atual = i === 0 ? f : { ...f, turmaId: randomUUID(), ofertaId: randomUUID(), matriculaId: randomUUID(), matriculaDisciplinaId: randomUUID() };
    if (i > 0) {
      await pg.db("piv.turma").insert({ ...turma, id: atual.turmaId, sigla: atual.turmaId });
      await pg.db("piv.turma_disciplina").insert({ id: atual.ofertaId, turma_id: atual.turmaId,
        curso_disciplina_id: f.cursoDisciplinaId, professor_id: oferta.professor_id });
      await pg.db("piv.matricula").insert({ id: atual.matriculaId, aluno_id: f.alunoId, curso_id: f.cursoId,
        turma_id: atual.turmaId, status: "ativa", data_matricula: new Date(2026, 0, i + 1) });
      await pg.db("piv.matricula_turma_disciplina").insert({ id: atual.matriculaDisciplinaId,
        turma_disciplina_id: atual.ofertaId, matricula_id: atual.matriculaId, status: "ativa" });
    }
    const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, atual, { valor: "120.00" });
    if (!historico || i % 3 !== 2) {
      await criarNotaPontuacao(pg.db, atual, avaliacaoId, { valor: historico && i % 3 === 0 ? "72.00" : "0.00" });
      for (let a = 0; a < 4; a++) {
        const aulaId = randomUUID();
        await pg.db("piv.aula").insert({ id: aulaId, data: `2026-09-${20 + a}T12:00:00Z`, local_id: localId,
          professor_id: oferta.professor_id, turma_disciplina_id: atual.ofertaId });
        await pg.db("piv.frequencia").insert({ aula_id: aulaId, matricula_turma_disciplina_id: atual.matriculaDisciplinaId,
          data: `2026-09-${20 + a}`, status: a === 3 ? "AUSENTE" : "PRESENTE", lancada_em: pg.db.fn.now(),
          responsavel_lancamento_usuario_id: f.usuarioId });
      }
    }
    if (historico && i % 3 !== 0) {
      await pg.db("piv.matricula").where({ id: atual.matriculaId }).update({ status: i % 3 === 1 ? "concluida" : "cancelada" });
      await pg.db("piv.matricula_turma_disciplina").where({ id: atual.matriculaDisciplinaId }).update({ status: i % 3 === 1 ? "aprovada" : "cancelada" });
    }
    linhas.push({ fixture: atual, avaliacaoId, indice: i });
  }
  return { f, linhas };
}

function validarResultado(linhas: LinhaDataset[], matriculas: any[]) {
  expect(matriculas).toHaveLength(linhas.length);
  for (const linha of linhas) {
    const m = matriculas.find((m) => m.matricula_turma_disciplina_id === linha.fixture.matriculaDisciplinaId);
    expect(m).toBeDefined();
    if (linha.indice % 3 === 2) {
      expect(m.notas.has(linha.avaliacaoId)).toBe(false);
      expect(m.resultadoAcademico).toMatchObject({ pontosEfetivos: null, percentualResultado: null, aprovacaoDisciplina: "PENDENTE",
        frequencia: { presencas: 0, faltas: 0, percentual: null } });
    } else {
      expect(m.notas.get(linha.avaliacaoId)).toBe(linha.indice % 3 === 0 ? "72.00" : "0.00");
      expect(m.resultadoAcademico).toMatchObject({ pontosEfetivos: linha.indice % 3 === 0 ? "72.00" : "0.00",
        aprovacaoDisciplina: linha.indice % 3 === 0 ? "APROVADA" : "PENDENTE",
        frequencia: { presencas: 3, faltas: 1, percentual: 75 } });
    }
  }
}

async function hashDataset(linhas: LinhaDataset[]) {
  const mtdIds = linhas.map((l) => l.fixture.matriculaDisciplinaId);
  const ids: Record<string, string[]> = { matricula: linhas.map((l) => l.fixture.matriculaId),
    matricula_turma_disciplina: mtdIds, avaliacao: linhas.map((l) => l.avaliacaoId),
    turma_disciplina: linhas.map((l) => l.fixture.ofertaId), turma: linhas.map((l) => l.fixture.turmaId),
    regra_pontuacao: [linhas[0].fixture.regraId] };
  const tabelas: Record<string, unknown[]> = {};
  for (const [tabela, valores] of Object.entries(ids)) tabelas[tabela] = await pg.db(`piv.${tabela}`).whereIn("id", valores).orderBy("id");
  for (const tabela of ["nota", "frequencia"]) tabelas[tabela] = await pg.db(`piv.${tabela}`)
    .whereIn("matricula_turma_disciplina_id", mtdIds).orderBy("id");
  tabelas.aula = await pg.db("piv.aula").whereIn("turma_disciplina_id", ids.turma_disciplina).orderBy("id");
  return createHash("sha256").update(JSON.stringify(tabelas)).digest("hex");
}

describe("T091 - consultas em lote e concorrência real, sem SLO de produção", () => {
  it("mantém custo de consultas constante em 1/20 matrículas históricas e 1/20 ofertas", async () => {
    const leituras: any[] = [];
    for (const quantidade of [1, 20]) {
      const { f, linhas } = await dataset(quantidade);
      const hashAntes = await hashDataset(linhas);
      const resultado = criarResultado(new NotaRepository(pg.db));
      const ficha = new FichaService();
      Object.assign(ficha, { resultadoService: resultado });
      const operacoes = { resultado: () => resultado.consultar({ alunoId: f.alunoId, incluirMatriculasHistoricas: true }, request(f.usuarioId)),
        ficha: () => ficha.montarFicha(f.alunoId, request(f.usuarioId)) };
      for (const [nome, operacao] of Object.entries(operacoes)) {
        const aquecimento: number[] = [];
        const registros: any[] = [];
        for (let i = 0; i < aquecimentos + amostras; i++) {
          const leitura = await observar(operacao as () => Promise<any>);
          if (nome === "resultado") validarResultado(linhas, leitura.resultado.matriculas);
          else {
            expect(leitura.resultado.matriculas).toHaveLength(quantidade);
            expect(leitura.resultado.notas).toHaveLength(quantidade);
            for (const linha of linhas) {
              const m = leitura.resultado.matriculas.find((m: any) => m.matricula_turma_disciplina_id === linha.fixture.matriculaDisciplinaId);
              expect(m).toMatchObject({ matricula_id: linha.fixture.matriculaId, turma_disciplina_id: linha.fixture.ofertaId,
                vinculo_status: linha.indice % 3 === 0 ? "ativa" : linha.indice % 3 === 1 ? "aprovada" : "cancelada" });
              const nota = leitura.resultado.notas.find((n: any) => n.matriculaTurmaDisciplinaId === linha.fixture.matriculaDisciplinaId);
              expect(nota.avaliacoes[0].nota).toBe(linha.indice % 3 === 2 ? null : linha.indice % 3 === 0 ? "72.00" : "0.00");
            }
          }
          if (i < aquecimentos) aquecimento.push(leitura.ms);
          else registros.push({ duracaoMs: leitura.ms, consultas: leitura.consultas });
        }
        const item = { leitor: nome, ofertas: quantidade, matriculas: quantidade, avaliacoes: quantidade,
          notas: linhas.filter((l) => l.indice % 3 !== 2).length, registrosFrequencia: linhas.filter((l) => l.indice % 3 !== 2).length * 4,
          historicas: linhas.filter((l) => l.indice % 3 !== 0).length,
          aquecimentoMs: aquecimento, amostras: registros, ...resumir(registros.map((r) => r.duracaoMs)) };
        leituras.push(item);
        expect(new Set(registros.map((r) => r.consultas.dominio)).size).toBe(1);
      }
      const hashDepois = await hashDataset(linhas);
      expect(hashDepois).toBe(hashAntes);
      for (const item of leituras.filter((m) => m.ofertas === quantidade)) Object.assign(item,
        { preservacao: { tabelas: 9, colunas: "todas, limitadas aos IDs próprios", hashAntes, hashDepois } });
      // Controle adicional fora das amostras: pai sem MTD continua no envelope.
      const semVinculoId = randomUUID();
      await pg.db("piv.matricula").insert({ id: semVinculoId, aluno_id: f.alunoId, curso_id: f.cursoId,
        turma_id: f.outraTurmaId, status: "cancelada" });
      const comPaiSemVinculo = await ficha.montarFicha(f.alunoId, request(f.usuarioId));
      expect(comPaiSemVinculo.matriculas).toHaveLength(quantidade + 1);
      expect(comPaiSemVinculo.notas).toHaveLength(quantidade);
      expect(comPaiSemVinculo.matriculas).toContainEqual(expect.objectContaining({ matricula_id: semVinculoId,
        status: "cancelada", matricula_turma_disciplina_id: null, turma_disciplina_id: null, vinculo_status: null }));
      for (const perfil of ["professor", "aluno"]) {
        const recusada = await observar(async () => {
          await expect(ficha.montarFicha(f.alunoId, request(f.usuarioId, perfil))).rejects.toMatchObject({ status: 403 });
        });
        expect(recusada.queries).toEqual([]);
      }
    }
    for (const nome of fase === "antes" ? ["resultado"] : ["resultado", "ficha"]) {
      const par = leituras.filter((m) => m.leitor === nome);
      expect(par[1].amostras[0].consultas).toEqual(par[0].amostras[0].consultas);
    }
    medidas.leituras = leituras;
  }, 120_000);

  it.skipIf(fase === "antes")("duas ofertas da mesma regra usada alcançam juntas o callback depois dos locks", async () => {
    const { f, linhas } = await dataset(2, false);
    const regraAntes = await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first();
    expect(regraAntes.usada_em).not.toBeNull();
    const registros: any[] = [];
    for (let rodada = 0; rodada < aquecimentos + amostras; rodada++) {
      const pids: number[] = [];
      const txIds: string[] = [];
      let ambas: () => void;
      const chegaram = new Promise<void>((resolve) => { ambas = resolve; });
      let liberar: () => void;
      const porta = new Promise<void>((resolve) => { liberar = resolve; });
      const repos = linhas.map(() => new NotaRepository(pg.db));
      for (const repo of repos) {
        const original = repo.transacaoParaNotas.bind(repo);
        repo.transacaoParaNotas = (id, alunos, callback) => original(id, alunos, async (trx) => {
          const identificacao: any = await trx.raw("SELECT pg_backend_pid() AS pid");
          pids.push(identificacao.rows[0].pid);
          // O identificador é exclusivamente de instrumentação, nunca dado pessoal.
          const registrar = (q: any) => { if (q.__knexTxId && !txIds.includes(q.__knexTxId)) txIds.push(q.__knexTxId); };
          trx.on("query", registrar);
          await trx.raw("/* T091_OBSERVADOR */ SELECT 1");
          trx.off("query", registrar);
          if (pids.length === 2) ambas!();
          await porta;
          return callback(trx);
        });
      }
      const queries: Consulta[] = [];
      const registrar = (q: any) => queries.push({ sql: q.sql, trx: q.__knexTxId });
      pg.db.on("query", registrar);
      const inicio = performance.now();
      let liberacaoBloqueador = inicio;
      let liberacaoCallbacks = inicio;
      let evidencias: any;
      let conclusaoDisputa: Promise<any> | undefined;
      const operacoes = repos.map((repo, i) => async () => {
        const inicioOperacao = performance.now();
        const resposta = await new NotaService(repo).salvarLote(linhas[i].avaliacaoId,
          { itens: [{ alunoId: f.alunoId, valor: rodada % 2 ? "60.00" : "72.00" }], motivo: "Medição sintética T091" }, request(f.usuarioId));
        return { duracaoTotalMs: performance.now() - inicioOperacao, depoisLiberacaoMs: performance.now() - liberacaoCallbacks,
          valor: resposta.alunos[0].valor };
      });
      try {
        const disputa = disputarComBloqueioAcademico(pg.db,
          async (trx) => { await trx("piv.periodo_letivo").where({ id: f.periodoId }).forUpdate(); }, operacoes,
          { aposComprovarBloqueio: async () => { liberacaoBloqueador = performance.now(); } });
        // Instala o handler antes da rendezvous; falhas não deixam sessões/promes­sas órfãs.
        conclusaoDisputa = disputa.then((valor) => ({ valor }), (erro: unknown) => ({ erro }));
        let timer: ReturnType<typeof setTimeout>;
        try {
          await Promise.race([chegaram, conclusaoDisputa.then((r) => {
            if (r.erro) throw r.erro;
            throw new Error("Os escritores terminaram antes da rendezvous pós-locks.");
          }), new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error("As duas ofertas não alcançaram juntas o callback depois dos locks.")), 10_000);
          })]);
          expect(new Set(pids).size).toBe(2);
          const estado = await pg.db.raw(`/* T091_OBSERVADOR */ SELECT a.pid, a.state, pg_blocking_pids(a.pid) AS bloqueadores,
            ARRAY(SELECT DISTINCT l.mode FROM pg_locks l WHERE l.pid=a.pid AND l.granted AND l.relation='piv.periodo_letivo'::regclass) AS locks_pai,
            ARRAY(SELECT DISTINCT l.mode FROM pg_locks l WHERE l.pid=a.pid AND l.granted AND l.relation='piv.regra_pontuacao'::regclass) AS locks_regra
            FROM pg_stat_activity a WHERE a.pid=ANY(?::int[]) ORDER BY a.pid`, [pids]);
          expect(estado.rows).toHaveLength(2);
          for (const sessao of estado.rows) {
            expect(sessao.bloqueadores).toEqual([]);
            expect(sessao.locks_pai).toContain("RowShareLock");
            expect(sessao.locks_regra).not.toContain("RowShareLock");
            expect(sessao.locks_regra).not.toContain("RowExclusiveLock");
          }
          evidencias = estado.rows;
        } finally { clearTimeout(timer!); liberacaoCallbacks = performance.now(); liberar!(); }
        const observacoes: any[] = [];
        let terminou = false;
        void conclusaoDisputa.then(() => { terminou = true; });
        while (!terminou) {
          const observacao = await pg.db.raw(`/* T091_OBSERVADOR */ SELECT a.pid, a.state,
            a.wait_event_type, pg_blocking_pids(a.pid) AS bloqueadores,
            ARRAY(SELECT DISTINCT l.mode FROM pg_locks l WHERE l.pid=a.pid AND l.granted
              AND l.relation='piv.regra_pontuacao'::regclass) AS locks_regra
            FROM pg_stat_activity a WHERE a.pid=ANY(?::int[]) ORDER BY a.pid`, [pids]);
          observacoes.push(observacao.rows);
          for (const sessao of observacao.rows) {
            expect(sessao.bloqueadores).toEqual([]);
            expect(sessao.locks_regra).not.toContain("RowShareLock");
            expect(sessao.locks_regra).not.toContain("RowExclusiveLock");
          }
        }
        const conclusao = await conclusaoDisputa;
        if (conclusao.erro) throw conclusao.erro;
        const concluida = conclusao.valor as Awaited<typeof disputa>;
        expect(concluida.bloqueios).toHaveLength(2);
        for (const resultado of concluida.resultados) {
          if (resultado.status === "rejected") throw resultado.reason;
          expect(resultado.value.valor).toBe(rodada % 2 ? "60.00" : "72.00");
        }
        const sqlEscritores = queries.filter((q) => q.trx && txIds.includes(q.trx));
        expect(sqlEscritores.some((q) => /for share/i.test(q.sql))).toBe(true);
        expect(sqlEscritores.filter((q) => /regra_pontuacao/i.test(q.sql) && /for (share|update)/i.test(q.sql))).toEqual([]);
        const item = { duracaoParMs: performance.now() - inicio, esperaArtificialAteLiberarPaiMs: liberacaoBloqueador - inicio,
          rendezvousDepoisPaiMs: liberacaoCallbacks - liberacaoBloqueador,
          operacoes: concluida.resultados.map((r) => r.status === "fulfilled" ? r.value : null),
          consultasEscritores: contar(sqlEscritores), consultasPreparacaoEObservacao: contar(queries.filter((q) => !sqlEscritores.includes(q))),
          consultasBarreira: concluida.consultas, esperas: concluida.bloqueios, coexistenciaAposLocks: evidencias,
          observacoesDuranteEscrita: observacoes };
        registros.push(item);
      } finally { liberar!(); await conclusaoDisputa; pg.db.off("query", registrar); }
    }
    expect(await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first()).toEqual(regraAntes);
    medidas.escritas = { ofertas: 2, regraCompartilhada: 1, notasPreexistentes: 2,
      aquecimentos: registros.slice(0, aquecimentos), amostras: registros.slice(aquecimentos),
      ...resumir(registros.slice(aquecimentos).map((r) => r.duracaoParMs)),
      depoisLiberacao: resumir(registros.slice(aquecimentos).flatMap((r) => r.operacoes.map((o: any) => o.depoisLiberacaoMs))),
      conclusao: "Ambos os escritores alcançaram o callback após T010 simultaneamente; parents SHARE coexistem e regra usada não recebeu SHARE/UPDATE." };
  }, 120_000);
});
