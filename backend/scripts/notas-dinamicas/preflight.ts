import { createHash } from "node:crypto";
import knexLib, { type Knex } from "knex";
import { calcularBoletim, type AvaliacaoResumo } from "./calculo-legado";
import { calcularResultadoAcademico } from "../../src/Modules/notas/models/ResultadoAcademico";
import { calcularPlanoAvaliacao } from "../../src/Modules/avaliacao/services/PlanoAvaliacaoService";
import { formatarPontos, parsePontos } from "../../src/Modules/avaliacao/models/Pontos";
import type { RegraPontuacao } from "../../src/Modules/avaliacao/models/RegraPontuacao";
import { consolidarFrequencia } from "../../src/Modules/frequencia/service/FrequenciaConsolidada";
import { ErroOperacaoPontuacao, lerDestinoSelecionado, validarDestinoPreflight, type SelecionarDestinoPreflight } from "./destino";

export const REFERENCIA_LEGADO = "27be0d9c5306eda581d3aacffa1028b2671424b5";
export const GRUPOS_HISTORICOS = [
  { tipo: "PROVA", nome: "Provas", orcamentoPontos: "60.00", modoQuantidade: "FIXA" as const, quantidadeFixa: 3 },
  { tipo: "TPI", nome: "TPI", orcamentoPontos: "5.00", modoQuantidade: "FIXA" as const, quantidadeFixa: 1 },
  { tipo: "TRABALHO", nome: "Trabalhos", orcamentoPontos: "35.00", modoQuantidade: "SEM_LIMITE" as const, quantidadeFixa: null },
] as const;
const PAGINA = 500;
type Executor = Knex | Knex.Transaction;
export interface DivergenciaHistorica {
  codigo: string; ofertaId?: string; matriculaTurmaDisciplinaId?: string; registroId?: string; campo?: string;
}
export interface RegistroManifesto { tabela: string; quantidade: number; sha256: string }
export interface RelatorioPreflight {
  apto: boolean;
  divergencias: DivergenciaHistorica[];
  manifesto: {
    referenciaCodigo: string; versaoPostgres: string; geradoEm: string; snapshot: string;
    migrations: { nome: string; batch: number }[];
    constraints: { tabela: string; nome: string; definicao: string }[];
    indices: { tabela: string; nome: string; definicao: string }[];
    registros: RegistroManifesto[];
  };
}
export interface OpcoesPreflight extends SelecionarDestinoPreflight { referenciaCodigo: string }

/** Hash incremental: todas as colunas e linhas, sem transportar PII ou valores do banco. */
export async function inventariarRegistros(executor: Executor, colunasOriginais?: Record<string, string[]>): Promise<RegistroManifesto[]> {
  const tabelas = colunasOriginais ? Object.keys(colunasOriginais).sort()
    : (await executor("pg_tables").where({ schemaname: "piv" }).select("tablename").orderBy("tablename")).map((t) => String(t.tablename));
  const registros: RegistroManifesto[] = [];
  for (const tabela of tabelas) {
    const hash = createHash("sha256"); let quantidade = 0;
    for (let offset = 0; ; offset += PAGINA) {
      const consulta = colunasOriginais
        ? executor(`piv.${tabela}`).select(colunasOriginais[tabela]).as("t") : executor(`piv.${tabela}`).select("*").as("t");
      const pagina = await executor.from(consulta).select(executor.raw("to_jsonb(t)::text AS registro"))
        .orderByRaw('to_jsonb(t)::text COLLATE "C"').limit(PAGINA).offset(offset);
      for (const linha of pagina) hash.update(`${linha.registro}\n`);
      quantidade += pagina.length;
      if (pagina.length < PAGINA) break;
    }
    registros.push({ tabela, quantidade, sha256: hash.digest("hex") });
  }
  return registros;
}

async function paginas<T>(consulta: Knex.QueryBuilder): Promise<T[]> {
  const linhas: T[] = [];
  for (let offset = 0; ; offset += PAGINA) {
    const pagina = await consulta.clone().limit(PAGINA).offset(offset);
    linhas.push(...pagina);
    if (pagina.length < PAGINA) return linhas;
  }
}

function regraVirtual(cursoId: string, periodoId: string): RegraPontuacao {
  return { id: "00000000-0000-0000-0000-000000000100", cursoId, periodoLetivoId: periodoId,
    totalPontos: "100.00", origem: "HISTORICA", versao: 1, estado: "PRESERVADA", usadaEm: null,
    criadaEm: "", atualizadaEm: "", criadaPorUsuarioId: null, atualizadaPorUsuarioId: null,
    subgrupos: GRUPOS_HISTORICOS.map((grupo, ordem) => ({ id: `00000000-0000-0000-0000-${String(ordem + 1).padStart(12, "0")}`,
      nome: grupo.nome, orcamentoPontos: grupo.orcamentoPontos, modoQuantidade: grupo.modoQuantidade,
      quantidadeFixa: grupo.quantidadeFixa, ordem })) };
}

interface Oferta { id: string; curso_id: string; periodo_letivo_id: string; matriz_curso_id: string; turma_id: string; curso_disciplina_id: string; professor_id: string | null }
interface Avaliacao { id: string; turma_disciplina_id: string; tipo_avaliacao: string; valor: string }
interface Vinculo { id: string; turma_disciplina_id: string; matricula_id: string; turma_id: string; matricula_turma_id: string; aluno_id: string; curso_id: string; matricula_curso_id: string }
interface Nota { id: string; avaliacao_id: string; matricula_turma_disciplina_id: string; valor: string }

/** Usada somente dentro do snapshot público ou da transação integral da adoção. */
export async function analisarHistoricoNoExecutor(executor: Executor, referenciaCodigo = REFERENCIA_LEGADO,
  opcoes: { historicoRepresentado?: boolean } = {}): Promise<RelatorioPreflight> {
  const divergencias: DivergenciaHistorica[] = [];
  const registrar = (codigo: string, detalhes: Omit<DivergenciaHistorica, "codigo"> = {}) => divergencias.push({ codigo, ...detalhes });
  const versao = await executor.raw("SHOW server_version");
  const metadados = await executor.raw("SELECT clock_timestamp() AS gerado_em, txid_current_snapshot()::text AS snapshot");
  const migrations = await executor("public.knex_migrations").select("name", "batch").orderBy("name");
  const constraints = await executor.raw(`SELECT coalesce(t.relname,'') AS tabela,c.conname AS nome,
    pg_get_constraintdef(c.oid,true) AS definicao FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
    LEFT JOIN pg_class t ON t.oid=c.conrelid WHERE n.nspname='piv' ORDER BY tabela,nome`);
  const indices = await executor("pg_indexes").where({ schemaname: "piv" })
    .select("tablename as tabela", "indexname as nome", "indexdef as definicao").orderBy(["tablename", "indexname"]);
  const registros = await inventariarRegistros(executor);
  const manifesto: RelatorioPreflight["manifesto"] = { referenciaCodigo, versaoPostgres: String(versao.rows[0].server_version),
    geradoEm: new Date(metadados.rows[0].gerado_em).toISOString(), snapshot: metadados.rows[0].snapshot,
    migrations: migrations.map((m) => ({ nome: String(m.name), batch: Number(m.batch) })),
    constraints: constraints.rows, indices, registros };

  // Configuração dinâmica já existente não constitui a fronteira histórica de adoção.
  if (!opcoes.historicoRepresentado && registros.some((r) => ["regra_pontuacao", "subgrupo_avaliacao", "regra_pontuacao_auditoria"].includes(r.tabela) && r.quantidade > 0)) {
    registrar("FRONTEIRA_JA_CONFIGURADA");
  }
  const ofertas = await paginas<Oferta>(executor("piv.turma_disciplina as td")
    .leftJoin("piv.turma as t", "t.id", "td.turma_id").leftJoin("piv.curso_disciplina as cd", "cd.id", "td.curso_disciplina_id")
    .leftJoin("piv.periodo_letivo as pl", "pl.id", "t.periodo_letivo_id").leftJoin("piv.curso as c", "c.id", "t.curso_id")
    .select("td.id", "td.turma_id", "td.curso_disciplina_id", "td.professor_id", "c.id as curso_id", "pl.id as periodo_letivo_id", "cd.curso_id as matriz_curso_id").orderBy("td.id"));
  const avaliacoes = await paginas<Avaliacao>(executor("piv.avaliacao").select("id", "turma_disciplina_id", "tipo_avaliacao", "valor").orderBy("id"));
  const vinculos = await paginas<Vinculo>(executor("piv.matricula_turma_disciplina as mtd")
    .leftJoin("piv.matricula as m", "m.id", "mtd.matricula_id").leftJoin("piv.turma_disciplina as td", "td.id", "mtd.turma_disciplina_id")
    .leftJoin("piv.turma as t", "t.id", "td.turma_id").leftJoin("piv.aluno as a", "a.id", "m.aluno_id")
    .select("mtd.id", "mtd.turma_disciplina_id", "mtd.matricula_id", "td.turma_id", "m.turma_id as matricula_turma_id",
      "a.id as aluno_id", "t.curso_id", "m.curso_id as matricula_curso_id").orderBy("mtd.id"));
  const notas = await paginas<Nota>(executor("piv.nota").select("id", "avaliacao_id", "matricula_turma_disciplina_id", "valor").orderBy("id"));
  const auditorias = await paginas<{ id: string; nota_id: string; valor_anterior: string | null; valor_novo: string | null }>(
    executor("piv.nota_auditoria").select("id", "nota_id", "valor_anterior", "valor_novo").orderBy("id"));
  const autorizacoes = await paginas<{ id: string; avaliacao_id: string; matricula_turma_disciplina_id: string | null }>(
    executor("piv.nota_autorizacao_excepcional").select("id", "avaliacao_id", "matricula_turma_disciplina_id").orderBy("id"));
  const frequencias = await executor("piv.frequencia").select("matricula_turma_disciplina_id")
    .select(executor.raw("COUNT(*) FILTER (WHERE status='PRESENTE') AS presencas, COUNT(*) FILTER (WHERE status='AUSENTE') AS faltas"))
    .groupBy("matricula_turma_disciplina_id");
  const ofertasPorId = new Map(ofertas.map((o) => [o.id, o]));
  const avPorId = new Map(avaliacoes.map((a) => [a.id, a]));
  const vinculosPorId = new Map(vinculos.map((m) => [m.id, m]));
  const notasPorId = new Map(notas.map((n) => [n.id, n]));
  const frequenciasPorId = new Map(frequencias.map((f) => [f.matricula_turma_disciplina_id, consolidarFrequencia(Number(f.presencas), Number(f.faltas))]));
  const invalidas = new Set<string>();
  const decimal = (valor: unknown, positivo: boolean, detalhe: Omit<DivergenciaHistorica, "codigo">) => {
    try { return parsePontos(valor, { positivo }); }
    catch { registrar("PONTOS_HISTORICOS_INVALIDOS", detalhe); if (detalhe.ofertaId) invalidas.add(detalhe.ofertaId); return null; }
  };
  for (const o of ofertas) {
    if (!o.curso_id || !o.periodo_letivo_id || !o.matriz_curso_id || o.curso_id !== o.matriz_curso_id) {
      registrar("OFERTA_MATRIZ_INCOMPATIVEL", { ofertaId: o.id }); invalidas.add(o.id);
    }
  }
  for (const a of avaliacoes) {
    const detalhe = { ofertaId: a.turma_disciplina_id, registroId: a.id, campo: "avaliacao.valor" };
    if (!ofertasPorId.has(a.turma_disciplina_id)) { registrar("AVALIACAO_ORFA", detalhe); invalidas.add(a.turma_disciplina_id); }
    const valor = decimal(a.valor, true, detalhe);
    if (!["PROVA", "TPI", "TRABALHO", "RECUPERACAO"].includes(a.tipo_avaliacao)
      || (a.tipo_avaliacao === "PROVA" && valor !== 2000n) || (a.tipo_avaliacao === "TPI" && valor !== 500n)
      || (a.tipo_avaliacao === "RECUPERACAO" && valor !== 10000n)) {
      registrar("AVALIACAO_HISTORICA_INCOMPATIVEL", detalhe); invalidas.add(a.turma_disciplina_id);
    }
  }
  for (const m of vinculos) {
    if (!ofertasPorId.has(m.turma_disciplina_id) || !m.aluno_id || m.turma_id !== m.matricula_turma_id || m.curso_id !== m.matricula_curso_id) {
      registrar("MATRICULA_OFERTA_INCOMPATIVEL", { ofertaId: m.turma_disciplina_id, matriculaTurmaDisciplinaId: m.id }); invalidas.add(m.turma_disciplina_id);
    }
  }
  const chavesNotas = new Set<string>();
  for (const n of notas) {
    const a = avPorId.get(n.avaliacao_id); const m = vinculosPorId.get(n.matricula_turma_disciplina_id);
    const detalhe = { ofertaId: a?.turma_disciplina_id, matriculaTurmaDisciplinaId: n.matricula_turma_disciplina_id, registroId: n.id, campo: "nota.valor" };
    const valor = decimal(n.valor, false, detalhe);
    if (!a || !m || a.turma_disciplina_id !== m.turma_disciplina_id) registrar("NOTA_OFERTA_INCOMPATIVEL", detalhe);
    else if (valor !== null && !invalidas.has(a.turma_disciplina_id) && valor > parsePontos(a.valor)) { registrar("NOTA_ACIMA_MAXIMO", detalhe); invalidas.add(a.turma_disciplina_id); }
    const chave = `${n.avaliacao_id}/${n.matricula_turma_disciplina_id}`;
    if (chavesNotas.has(chave)) registrar("NOTA_DUPLICADA", detalhe);
    chavesNotas.add(chave);
  }
  for (const audit of auditorias) {
    const nota = notasPorId.get(audit.nota_id); const a = nota ? avPorId.get(nota.avaliacao_id) : undefined;
    if (!nota) registrar("AUDITORIA_ORFA", { registroId: audit.id });
    for (const campo of ["valor_anterior", "valor_novo"] as const) if (audit[campo] !== null) {
      decimal(audit[campo], false, { ofertaId: a?.turma_disciplina_id, registroId: audit.id, campo: `nota_auditoria.${campo}` });
    }
  }
  for (const aut of autorizacoes) {
    const a = avPorId.get(aut.avaliacao_id); const m = aut.matricula_turma_disciplina_id ? vinculosPorId.get(aut.matricula_turma_disciplina_id) : undefined;
    if (!a || (aut.matricula_turma_disciplina_id !== null && (!m || m.turma_disciplina_id !== a.turma_disciplina_id))) {
      registrar("AUTORIZACAO_OFERTA_INCOMPATIVEL", { ofertaId: a?.turma_disciplina_id, registroId: aut.id });
    }
  }

  const avaliacoesPorOferta = new Map<string, Avaliacao[]>();
  for (const a of avaliacoes) { const lista = avaliacoesPorOferta.get(a.turma_disciplina_id) ?? []; lista.push(a); avaliacoesPorOferta.set(a.turma_disciplina_id, lista); }
  const notasPorMatricula = new Map<string, Nota[]>();
  for (const n of notas) { const lista = notasPorMatricula.get(n.matricula_turma_disciplina_id) ?? []; lista.push(n); notasPorMatricula.set(n.matricula_turma_disciplina_id, lista); }
  const planos = new Map<string, ReturnType<typeof calcularPlanoAvaliacao>>();
  for (const [ofertaId, itens] of avaliacoesPorOferta) {
    if (invalidas.has(ofertaId)) continue;
    const o = ofertasPorId.get(ofertaId)!; const regra = regraVirtual(o.curso_id, o.periodo_letivo_id);
    // O serviço de plano recebe composições já válidas. Inventário precisa reportar
    // excessos históricos antes de produzir um saldo negativo para esse serviço.
    const excesso = GRUPOS_HISTORICOS.some((grupo) => {
      const doGrupo = itens.filter((a) => a.tipo_avaliacao === grupo.tipo);
      const total = doGrupo.reduce((soma, a) => soma + parsePontos(a.valor), 0n);
      return total > parsePontos(grupo.orcamentoPontos) || (grupo.quantidadeFixa !== null && doGrupo.length > grupo.quantidadeFixa);
    });
    if (excesso || itens.filter((a) => a.tipo_avaliacao === "RECUPERACAO").length > 1) {
      registrar("PLANO_HISTORICO_INCOMPATIVEL", { ofertaId }); invalidas.add(ofertaId); continue;
    }
    const lista = itens.map((a) => ({ ...a, subgrupo_id: a.tipo_avaliacao === "RECUPERACAO" ? null
      : regra.subgrupos[GRUPOS_HISTORICOS.findIndex((g) => g.tipo === a.tipo_avaliacao)].id }));
    const plano = calcularPlanoAvaliacao(ofertaId, regra, lista);
    planos.set(ofertaId, plano);
  }
  const situacoes = { NAO_LANCADA: "NAO_LANCADA", EM_ANDAMENTO: "EM_ANDAMENTO", APROVADO: "SUFICIENTE", EM_RECUPERACAO: "EM_RECUPERACAO", REPROVADO: "INSUFICIENTE" };
  for (const m of vinculos) {
    const itens = avaliacoesPorOferta.get(m.turma_disciplina_id); const plano = planos.get(m.turma_disciplina_id);
    if (!itens || !plano || invalidas.has(m.turma_disciplina_id)) continue;
    const notasDoAluno = notasPorMatricula.get(m.id) ?? [];
    if (notasDoAluno.some((n) => !avPorId.has(n.avaliacao_id) || avPorId.get(n.avaliacao_id)!.turma_disciplina_id !== m.turma_disciplina_id)) continue;
    const mapa = new Map(notasDoAluno.map((n) => [n.avaliacao_id, formatarPontos(parsePontos(n.valor))]));
    // Conversão Number ocorre exclusivamente no replay imutável, após validar a entrada.
    const legado = calcularBoletim(itens.map((a): AvaliacaoResumo => ({ id: a.id, tipo: a.tipo_avaliacao as AvaliacaoResumo["tipo"], descricao: null, valor: Number(a.valor) })),
      new Map([...mapa].map(([id, valor]) => [id, Number(valor)])));
    const novo = calcularResultadoAcademico({ turmaDisciplinaId: m.turma_disciplina_id, matriculaTurmaDisciplinaId: m.id,
      plano, avaliacoes: itens.map((a) => ({ id: a.id, tipo: a.tipo_avaliacao as AvaliacaoResumo["tipo"], valor: formatarPontos(parsePontos(a.valor)) })),
      notasPorAvaliacao: mapa, frequencia: frequenciasPorId.get(m.id) ?? consolidarFrequencia(0, 0) });
    // Outputs do legado já arredondados. Não comparar acumuladores binários crus.
    const pares: [string, unknown, unknown][] = [
      ["pontosRegularesObtidos", legado.pontosObtidos.toFixed(2), novo.pontosRegularesObtidos],
      ["pontosMaximosLancados", legado.pontosMaximos.toFixed(2), novo.pontosMaximosLancados],
      ["indicadorRegular.percentual", legado.mediaParcial, novo.indicadorRegular.percentual],
      ["pontosRecuperacao", legado.notaRecuperacao?.toFixed(2) ?? null, novo.pontosRecuperacao],
      ["etapaRegularCompleta", legado.etapaRegularCompleta, novo.etapaRegularCompleta],
      ["resultadoPorNota", situacoes[legado.situacao], novo.resultadoPorNota],
      ["elegivelRecuperacaoPorNota", legado.elegivelRecuperacao, novo.elegivelRecuperacaoPorNota],
    ];
    if (legado.etapaRegularCompleta) pares.push(["percentualResultado", legado.mediaFinal, novo.percentualResultado],
      ["pontosEfetivos", legado.mediaFinal?.toFixed(2) ?? null, novo.pontosEfetivos]);
    else if (novo.pontosEfetivos !== null || novo.percentualResultado !== null) pares.push(["resultadoIncompleto", null, novo.pontosEfetivos]);
    for (const [campo, anterior, atual] of pares) if (anterior !== atual) {
      registrar("RESULTADO_HISTORICO_DIVERGENTE", { ofertaId: m.turma_disciplina_id, matriculaTurmaDisciplinaId: m.id, campo });
    }
  }
  return { apto: divergencias.length === 0, divergencias, manifesto };
}

export async function gerarPreflight(db: Knex, opcoes: OpcoesPreflight): Promise<RelatorioPreflight> {
  if (!/^[0-9a-f]{40}$/i.test(opcoes.referenciaCodigo)) throw new ErroOperacaoPontuacao("REFERENCIA_INVALIDA", "Informe a referência exata do código avaliado.");
  validarDestinoPreflight(db, opcoes);
  return db.transaction((trx) => analisarHistoricoNoExecutor(trx, opcoes.referenciaCodigo), { isolationLevel: "repeatable read", readOnly: true });
}

export function interpretarArgumentosPreflight(args: string[]): Required<SelecionarDestinoPreflight> & { referenciaCodigo: string } {
  if (args.length !== 6) throw new ErroOperacaoPontuacao("ARGUMENTOS_INVALIDOS", "Informe ambiente, variável de destino e referência de código.");
  const mapa = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) { if (mapa.has(args[i])) throw new ErroOperacaoPontuacao("ARGUMENTOS_INVALIDOS", "Argumentos duplicados."); mapa.set(args[i], args[i + 1]); }
  if ([...mapa.keys()].some((k) => !["--ambiente", "--destino-env", "--referencia-codigo"].includes(k))
    || !["teste", "homologacao", "producao"].includes(mapa.get("--ambiente"))
    || !/^[A-Z][A-Z0-9_]*$/.test(mapa.get("--destino-env")) || !/^[0-9a-f]{40}$/i.test(mapa.get("--referencia-codigo"))) {
    throw new ErroOperacaoPontuacao("ARGUMENTOS_INVALIDOS", "Argumentos explícitos inválidos.");
  }
  return { ambiente: mapa.get("--ambiente") as Required<SelecionarDestinoPreflight>["ambiente"],
    variavelDestino: mapa.get("--destino-env"), referenciaCodigo: mapa.get("--referencia-codigo") };
}

if (require.main === module) {
  void (async () => {
    let db: Knex | undefined;
    try {
      const opcoes = interpretarArgumentosPreflight(process.argv.slice(2));
      db = knexLib({ client: "pg", connection: lerDestinoSelecionado(opcoes.variavelDestino), searchPath: ["piv", "public"], pool: { min: 0, max: 1 } });
      const relatorio = await gerarPreflight(db, opcoes);
      process.stdout.write(`${JSON.stringify(relatorio, null, 2)}\n`);
      process.exitCode = relatorio.apto ? 0 : 2;
    } catch (erro) {
      process.stderr.write(`${JSON.stringify({ codigo: erro instanceof ErroOperacaoPontuacao ? erro.codigo : "PREFLIGHT_FALHOU",
        mensagem: "Preflight recusado ou indisponível; nenhum dado foi modificado." })}\n`);
      process.exitCode = 1;
    } finally { await db?.destroy(); }
  })();
}
