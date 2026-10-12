import type { Knex } from "knex";
import { validarDestinoPostgresTeste } from "../../src/test-helpers/disputaAcademica";

export interface SelecionarDestinoPreflight {
  ambiente?: "teste" | "homologacao" | "producao";
  variavelDestino?: string;
}

export class ErroOperacaoPontuacao extends Error {
  constructor(readonly codigo: string, mensagem: string) { super(mensagem); this.name = "ErroOperacaoPontuacao"; }
}

function recusar(): never {
  throw new ErroOperacaoPontuacao("DESTINO_INVALIDO", "Selecione explicitamente um destino PostgreSQL válido para esta operação.");
}

export function lerDestinoSelecionado(variavel: string): string {
  if (typeof variavel !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(variavel)) recusar();
  const valor = process.env[variavel];
  if (!valor) recusar();
  try { const url = new URL(valor); if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length <= 1) recusar(); }
  catch { recusar(); }
  return valor;
}

function identificar(conexao: unknown): string {
  if (typeof conexao === "string") {
    try {
      const url = new URL(conexao);
      if (!["postgres:", "postgresql:"].includes(url.protocol) || url.search) recusar();
      return JSON.stringify([url.hostname.toLowerCase(), url.port || "5432", decodeURIComponent(url.pathname.slice(1))]);
    } catch { recusar(); }
  }
  if (!conexao || typeof conexao !== "object") recusar();
  const c = conexao as Record<string, unknown>;
  if ("connectionString" in c || "options" in c || typeof c.host !== "string" || typeof c.database !== "string") recusar();
  return JSON.stringify([c.host.toLowerCase(), String(c.port ?? 5432), c.database]);
}

/** Valida a conexão configurada e a efetiva antes de abrir qualquer transação. */
export function validarDestinoPreflight(db: Knex, selecao: SelecionarDestinoPreflight = {}): void {
  if (db.isTransaction) throw new ErroOperacaoPontuacao("TRANSACAO_INVALIDA", "O preflight abre seu próprio snapshot somente leitura.");
  if (process.env.ACADEMICO_MODO_TESTE === "true") {
    if (selecao.ambiente && selecao.ambiente !== "teste") recusar();
    try { validarDestinoPostgresTeste(db); } catch { recusar(); }
    if (selecao.variavelDestino) {
      const esperado = identificar(lerDestinoSelecionado(selecao.variavelDestino));
      if (identificar(db.client.config.connection) !== esperado || identificar(db.client.connectionSettings) !== esperado) recusar();
    }
    return;
  }
  if (process.env.ACADEMICO_MODO_TESTE || !["homologacao", "producao"].includes(selecao.ambiente ?? "") || !selecao.variavelDestino) recusar();
  if (!["pg", "postgres", "postgresql"].includes(String(db.client.config.client))) recusar();
  const esperado = identificar(lerDestinoSelecionado(selecao.variavelDestino));
  if (identificar(db.client.config.connection) !== esperado || identificar(db.client.connectionSettings) !== esperado) recusar();
}

/** Fora do modo sintético, exige seleção explícita e autorização operacional do ambiente. */
export function validarDestinoRetorno(db: Knex, selecao: SelecionarDestinoPreflight = {}): void {
  validarDestinoPreflight(db, selecao);
}
