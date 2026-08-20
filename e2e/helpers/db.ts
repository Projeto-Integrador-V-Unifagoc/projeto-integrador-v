import knexFactory, { type Knex } from "knex";
import { config } from "./config.js";

/**
 * Acesso ao banco EXCLUSIVO de testes (spec §4.1, §5). Usado apenas para:
 *  - pré-condições sem endpoint público (cidade, local);
 *  - asserções de integridade/auditoria;
 *  - limpeza controlada entre execuções.
 *
 * Guarda de segurança: nenhuma operação destrutiva é permitida se o nome do
 * banco não terminar em `_e2e` ou `_test` (spec §5.1).
 */

function nomeDoBanco(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

const NOME_BANCO = nomeDoBanco(config.databaseUrl);
const BANCO_SEGURO = /(_e2e|_test)$/.test(NOME_BANCO);

export function exigirBancoDeTeste(): void {
  if (!BANCO_SEGURO) {
    throw new Error(
      `Recusando operar no banco "${NOME_BANCO}": o nome deve terminar em _e2e ou _test (spec §5.1).`,
    );
  }
}

let instancia: Knex | null = null;

export function db(): Knex {
  if (!instancia) {
    instancia = knexFactory({
      client: "pg",
      connection: config.databaseUrl,
      searchPath: ["piv", "public"],
      pool: { min: 0, max: 8 },
    });
  }
  return instancia;
}

export async function fecharDb(): Promise<void> {
  if (instancia) {
    await instancia.destroy();
    instancia = null;
  }
}

// Tabelas de dados em ordem pai → filho. A limpeza percorre todas; a ordem é
// irrelevante porque desativamos as checagens de FK na transação de limpeza,
// mas a lista documenta o grafo de dependências (spec §7.1).
export const TABELAS_DADOS = [
  "matricula_documento",
  "documento",
  "nota_auditoria",
  "frequencia_auditoria",
  "nota_autorizacao_excepcional",
  "nota",
  "frequencia",
  "avaliacao",
  "aula",
  "matricula_turma_disciplina",
  "matricula",
  "turma_disciplina",
  "turma",
  "curso_disciplina",
  "periodo_letivo",
  "aluno",
  "professor",
  "disciplinas",
  "pessoa",
  "curso",
  "departamento",
  "faculdade",
  "local",
  "status_disciplina",
  "status_matricula",
] as const;

/**
 * Limpa todos os dados transacionais preservando os dados de referência
 * (cidade) e a secretaria inicial (seed). Reaproveita uma única conexão com as
 * checagens de FK desativadas para não depender da ordem (spec §5.3).
 */
export async function limparBanco(): Promise<void> {
  exigirBancoDeTeste();
  await db().transaction(async (trx) => {
    await trx.raw("SET LOCAL session_replication_role = replica");
    for (const tabela of TABELAS_DADOS) {
      await trx(`piv.${tabela}`).del();
    }
    await trx("piv.usuario").whereNot("email", config.secretaria.email).del();
    await trx.raw("SET LOCAL session_replication_role = DEFAULT");
  });
}

let cidadeCache: { ibge: string; nome: string; uf: string } | null = null;

/** Retorna uma cidade de referência (seed) para usar como FK em pessoa/faculdade. */
export async function pegarCidade(): Promise<{ ibge: string; nome: string; uf: string }> {
  if (!cidadeCache) {
    const linha = await db()("piv.cidade")
      .select("ibge", "nome", "uf")
      .whereNotNull("ibge")
      .orderBy("nome")
      .first();
    if (!linha) throw new Error("Nenhuma cidade encontrada no seed (piv.cidade).");
    cidadeCache = { ibge: String(linha.ibge), nome: String(linha.nome), uf: String(linha.uf) };
  }
  return cidadeCache;
}

/**
 * Garante a existência de ao menos um `local` (sem endpoint público). Seguro sob
 * concorrência: o insert ignora conflito de unicidade e relê o registro.
 */
export async function garantirLocal(codigo: string): Promise<string> {
  await db()("piv.local").insert({ codigo }).onConflict("codigo").ignore();
  const linha = await db()("piv.local").where({ codigo }).first();
  return String(linha.id);
}

/** Conta linhas de uma tabela com filtro opcional — util para asserções. */
export async function contar(tabela: string, filtro: Record<string, unknown> = {}): Promise<number> {
  const linha = await db()(`piv.${tabela}`).where(filtro).count<{ count: string }>("* as count").first();
  return Number(linha?.count ?? 0);
}
