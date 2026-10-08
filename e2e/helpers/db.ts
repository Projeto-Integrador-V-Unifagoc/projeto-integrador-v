import knexFactory, { type Knex } from "knex";
import { config } from "./config.js";
import { exigirModoSintetico } from "./isolamento.js";
import { validarBancoTeste } from "../../backend/src/config/ambienteTeste";
import { validarDestinoPostgresTeste } from "../../backend/src/test-helpers/disputaAcademica";

/**
 * Acesso ao banco EXCLUSIVO de testes (spec §4.1, §5). Usado apenas para:
 *  - pré-condições sem endpoint público (cidade, local);
 *  - asserções de integridade/auditoria;
 *  - limpeza controlada entre execuções.
 *
 * Guarda de segurança: nenhuma operação destrutiva é permitida se o nome do
 * banco não terminar em `_e2e` ou `_test` (spec §5.1).
 */

export function exigirBancoDeTeste(): void {
  exigirModoSintetico();
  validarBancoTeste(config.databaseUrl);
}

let instancia: Knex | null = null;

export function db(): Knex {
  exigirBancoDeTeste();
  if (!instancia) {
    instancia = knexFactory({
      client: "pg",
      connection: config.databaseUrl,
      searchPath: ["piv", "public"],
      pool: { min: 0, max: 8 },
    });
  }
  validarDestinoPostgresTeste(instancia);
  return instancia;
}

export async function fecharDb(): Promise<void> {
  if (instancia) {
    await instancia.destroy();
    instancia = null;
  }
  cidadeCache = null;
}

// Inventário de grafos sintéticos, sem excluir histórico ou suspender guards.
export const TABELAS_DADOS = [
  "recuperacao_senha",
  "matricula_documento",
  "documento",
  "nota_auditoria",
  "regra_pontuacao_auditoria",
  "frequencia_auditoria",
  "nota_autorizacao_excepcional",
  "nota",
  "frequencia",
  "avaliacao",
  "aula",
  "matricula_turma_disciplina",
  "matricula",
  "turma_disciplina",
  "subgrupo_avaliacao",
  "regra_pontuacao",
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
 * A suíte comum começa em base vazia. História imutável exige recriar somente
 * o container próprio pelo provisionador, nunca DELETE/TRUNCATE ou replica.
 */
export async function exigirBaseVazia(): Promise<void> {
  exigirBancoDeTeste();
  const banco = db();
  for (const tabela of TABELAS_DADOS) {
    if (await banco(`piv.${tabela}`).first("id")) {
      throw new Error("A suíte exige base sem grafos transacionais. Preserve o histórico e recrie somente seu container descartável.");
    }
  }
  if (await banco("piv.usuario").whereNot("email", config.secretaria.email).first("id")) {
    throw new Error("A base possui usuários de outra execução. Recrie somente seu container descartável.");
  }
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
