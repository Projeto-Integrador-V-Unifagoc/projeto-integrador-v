import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Knex } from "knex";
import { bloquearRetornoPontuacao } from "../../migrations/20260928000100_expande_pontuacao_dinamica";
import { analisarHistoricoNoExecutor, REFERENCIA_LEGADO } from "./preflight";
import { ErroOperacaoPontuacao, validarDestinoRetorno, type SelecionarDestinoPreflight } from "./destino";

export const MIGRATIONS_PONTUACAO = [
  "20260928000100_expande_pontuacao_dinamica.ts",
  "20260928000200_adota_pontuacao_historica.ts",
  "20260928000300_protege_pontuacao_dinamica.ts",
] as const;

function incompatibilidade(): never {
  throw new ErroOperacaoPontuacao("RETORNO_INCOMPATIVEL", "Retorno recusado; preservar schema, histórico e escritas posteriores para correção adiante.");
}

/** Lista as antigas para validar o ledger, mas nunca as carrega/reexecuta. */
export async function fonteMigrationsPontuacao(): Promise<{ antigas: string[]; fonte: Knex.MigrationSource<string> }> {
  const arquivos = await readdir(path.resolve(__dirname, "../../migrations"));
  const antigas = arquivos.filter((nome) => nome.endsWith(".ts") && nome < MIGRATIONS_PONTUACAO[0]).sort();
  if (antigas.length !== 13) incompatibilidade();
  return { antigas, fonte: {
    async getMigrations() { return [...antigas, ...MIGRATIONS_PONTUACAO]; },
    getMigrationName(nome) { return nome; },
    async getMigration(nome) {
      if (!MIGRATIONS_PONTUACAO.includes(nome as any)) incompatibilidade();
      const arquivo = `../../migrations/${nome}`;
      return import(arquivo);
    },
  } };
}

async function conferirRepresentacaoTecnica(trx: Knex.Transaction): Promise<void> {
  const { rows } = await trx.raw(`SELECT EXISTS (
    SELECT 1 FROM piv.regra_pontuacao r WHERE r.origem<>'HISTORICA' OR r.total_pontos<>100
      OR r.criada_por_usuario_id IS NOT NULL OR r.atualizada_por_usuario_id IS NOT NULL
      OR (SELECT count(*) FROM piv.regra_pontuacao_auditoria a WHERE a.regra_pontuacao_id=r.id)<>1
      OR NOT EXISTS (SELECT 1 FROM piv.regra_pontuacao_auditoria a WHERE a.regra_pontuacao_id=r.id
        AND a.acao='ADOCAO_HISTORICA' AND a.usuario_id IS NULL AND a.perfil='MIGRACAO'
        AND a.novo->>'origemTemporal'='ADOCAO_TECNICA')
      OR (SELECT count(*) FROM piv.subgrupo_avaliacao s WHERE s.regra_pontuacao_id=r.id)<>3
      OR (SELECT count(*) FROM piv.subgrupo_avaliacao s WHERE s.regra_pontuacao_id=r.id AND (
        (s.nome='Provas' AND s.orcamento_pontos=60 AND s.modo_quantidade='FIXA' AND s.quantidade_fixa=3 AND s.ordem=0)
        OR (s.nome='TPI' AND s.orcamento_pontos=5 AND s.modo_quantidade='FIXA' AND s.quantidade_fixa=1 AND s.ordem=1)
        OR (s.nome='Trabalhos' AND s.orcamento_pontos=35 AND s.modo_quantidade='SEM_LIMITE' AND s.quantidade_fixa IS NULL AND s.ordem=2)))<>3
    ) AS incompativel`);
  if (rows[0].incompativel) incompatibilidade();
}

/**
 * Retorna somente003→002→001 em uma única transação. Seleção real futura exige
 * autorização operacional, janela sem escritores e backup/restauração preparados.
 * Não possui CLI destrutiva nem recua um batch com migrations de outras tarefas.
 */
export async function executarRetorno(db: Knex, selecao: SelecionarDestinoPreflight = {}): Promise<void> {
  validarDestinoRetorno(db, selecao);
  const { antigas, fonte } = await fonteMigrationsPontuacao();
  try {
    await db.transaction(async (trx) => {
      // Precedência igual à migration: metadata antes dos locks acadêmicos.
      // Os três downs reutilizam esta mesma sessão/commit; qualquer falha desfaz tudo.
      const locks = await trx("public.knex_migrations_lock").select("is_locked").forUpdate();
      if (locks.length !== 1 || Number(locks[0].is_locked) !== 0) incompatibilidade();
      const ledger = await trx("public.knex_migrations").select("name").orderBy("name");
      const esperado = [...antigas, ...MIGRATIONS_PONTUACAO].sort();
      if (JSON.stringify(ledger.map((m) => String(m.name))) !== JSON.stringify(esperado)) incompatibilidade();
      await bloquearRetornoPontuacao(trx);
      await conferirRepresentacaoTecnica(trx);
      const preflight = await analisarHistoricoNoExecutor(trx, REFERENCIA_LEGADO, { historicoRepresentado: true });
      if (!preflight.apto) incompatibilidade();
      for (const nome of [...MIGRATIONS_PONTUACAO].reverse()) {
        await trx.migrate.down({ name: nome, migrationSource: fonte, tableName: "knex_migrations",
          schemaName: "public", disableTransactions: true });
      }
    }, { isolationLevel: "read committed" });
  } catch { incompatibilidade(); }
}
