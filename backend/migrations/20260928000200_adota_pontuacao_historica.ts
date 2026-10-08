import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { analisarHistoricoNoExecutor, GRUPOS_HISTORICOS, REFERENCIA_LEGADO } from "../scripts/notas-dinamicas/preflight";
import { bloquearRetornoPontuacao } from "./20260928000100_expande_pontuacao_dinamica";

// Mesma precedência de classes de T010; todas as linhas são ordenadas por UUID.
const CLASSES = [
  ["curso", true], ["disciplinas", true], ["periodo_letivo", true], ["turma", true],
  ["curso_disciplina", true], ["professor", true], ["regra_pontuacao", false],
  ["turma_disciplina", false], ["avaliacao", false], ["matricula", true],
  ["matricula_turma_disciplina", false], ["nota", false], ["nota_autorizacao_excepcional", false],
] as const;

/** Migration exige o batch inteiro transacional de Knex; savepoints não substituem a janela operacional. */
export async function up(db: Knex): Promise<void> {
  if (!db.isTransaction) throw new Error("ADOCAO_EXIGE_TRANSACAO_INTEGRAL: aplicar expansão/adoção/proteções no batch transacional.");
  const tabelas = (await db("pg_tables").where({ schemaname: "piv" }).select("tablename")).map((t) => String(t.tablename));
  const principais = CLASSES.map(([nome]) => nome);
  const ordem = [...principais, ...tabelas.filter((nome) => !principais.includes(nome as any)).sort()];
  // Bloqueia também INSERTs ainda fora dos conjuntos descobertos, antes do replay.
  // SELECT continua disponível; nenhuma trigger é desativada.
  for (const tabela of ordem) await db.raw("LOCK TABLE ?? IN SHARE ROW EXCLUSIVE MODE", [`piv.${tabela}`]);
  for (const [tabela, pai] of CLASSES) {
    const consulta = db(`piv.${tabela}`).select("id").orderBy("id");
    if (pai) await consulta.forShare(); else await consulta.forUpdate();
  }
  const preflight = await analisarHistoricoNoExecutor(db, REFERENCIA_LEGADO);
  if (!preflight.apto) throw new Error(`HISTORICO_INCOMPATIVEL: adoção integral recusada (${preflight.divergencias.length} divergências).`);
  const ofertas = await db("piv.turma_disciplina as td").join("piv.turma as t", "t.id", "td.turma_id")
    .whereExists(db("piv.avaliacao as a").select(db.raw("1")).whereRaw("a.turma_disciplina_id = td.id"))
    .select("td.id", "t.curso_id", "t.periodo_letivo_id").orderBy(["t.curso_id", "t.periodo_letivo_id", "td.id"]);
  const momento = (await db.raw("SELECT clock_timestamp() AS momento")).rows[0].momento;
  const pares = new Map<string, { regraId: string; grupos: Map<string, string>; ofertas: string[] }>();
  for (const oferta of ofertas) {
    const chave = `${oferta.curso_id}/${oferta.periodo_letivo_id}`;
    let par = pares.get(chave);
    if (!par) {
      const regraId = randomUUID(); const grupos = new Map<string, string>();
      await db("piv.regra_pontuacao").insert({ id: regraId, curso_id: oferta.curso_id, periodo_letivo_id: oferta.periodo_letivo_id,
        total_pontos: "100.00", origem: "HISTORICA", versao: 1, usada_em: momento,
        criada_por_usuario_id: null, atualizada_por_usuario_id: null, created_at: momento, updated_at: momento });
      for (const [ordem, grupo] of GRUPOS_HISTORICOS.entries()) {
        const id = randomUUID(); grupos.set(grupo.tipo, id);
        await db("piv.subgrupo_avaliacao").insert({ id, regra_pontuacao_id: regraId, nome: grupo.nome,
          orcamento_pontos: grupo.orcamentoPontos, modo_quantidade: grupo.modoQuantidade,
          quantidade_fixa: grupo.quantidadeFixa, ordem });
      }
      par = { regraId, grupos, ofertas: [] }; pares.set(chave, par);
    }
    par.ofertas.push(oferta.id);
    // Atualiza somente colunas novas. Não altera tipos, máximos, datas ou autoria antigos.
    await db("piv.turma_disciplina").where({ id: oferta.id }).update({ regra_pontuacao_id: par.regraId, pontuacao_vinculada_em: momento });
    for (const [tipo, subgrupoId] of par.grupos) {
      await db("piv.avaliacao").where({ turma_disciplina_id: oferta.id, tipo_avaliacao: tipo }).update({ subgrupo_id: subgrupoId });
    }
    await db("piv.avaliacao as a").where({ turma_disciplina_id: oferta.id })
      .whereExists(db("piv.nota as n").select(db.raw("1")).whereRaw("n.avaliacao_id = a.id"))
      .update({ primeira_nota_em: momento });
  }
  for (const par of pares.values()) {
    await db("piv.regra_pontuacao_auditoria").insert({ regra_pontuacao_id: par.regraId, usuario_id: null,
      perfil: "MIGRACAO", acao: "ADOCAO_HISTORICA", anterior: null,
      novo: { origemTemporal: "ADOCAO_TECNICA", referenciaCodigo: REFERENCIA_LEGADO,
        ofertas: par.ofertas, totalPontos: "100.00", subgrupos: GRUPOS_HISTORICOS.map(({ tipo, ...grupo }) => grupo) }, criado_em: momento });
  }
}

/** Apenas representação técnica compatível; histórico original permanece integral. */
export async function down(db: Knex): Promise<void> {
  await bloquearRetornoPontuacao(db);
  // 003 precisa ter removido os guards no mesmo retorno integral.
  const { rows } = await db.raw("SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'pontuacao_%' LIMIT 1");
  if (rows.length) throw new Error("RETORNO_INCOMPATIVEL: remover primeiro as proteções novas na sequência coordenada.");
  await db("piv.avaliacao").update({ subgrupo_id: null, primeira_nota_em: null });
  await db("piv.turma_disciplina").update({ regra_pontuacao_id: null, pontuacao_vinculada_em: null });
  await db("piv.regra_pontuacao_auditoria").where({ acao: "ADOCAO_HISTORICA" }).delete();
  await db("piv.subgrupo_avaliacao").delete();
  await db("piv.regra_pontuacao").delete();
}
