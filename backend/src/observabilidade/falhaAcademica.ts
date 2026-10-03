import { randomUUID } from "node:crypto";
import type { Response } from "express";

export type OperacaoAcademica =
  | "notas.listarOpcoes" | "notas.obterLancamento" | "notas.salvarLote"
  | "notas.obterRendimento" | "notas.obterRecuperacao" | "notas.criarAutorizacao"
  | "notas.meuBoletim" | "notas.meuResumo" | "notas.consultarAluno"
  | "ficha.buscar" | "pontuacao.operacao" | "avaliacoes.operacao" | "estrutura.operacao";

const codigosBanco = new Set([
  "08001", "08003", "08006", "23502", "23503", "23505", "23514",
  "40001", "40P01", "53300", "57014", "57P01",
]);
const codigosInfraestrutura = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EPIPE"]);

function codigoPermitido(erro: unknown): string | undefined {
  if (!erro || typeof erro !== "object") return;
  // Só dados próprios: não executar getters nem serializar o erro/driver.
  const propriedade = Object.getOwnPropertyDescriptor(erro, "code");
  const codigo: unknown = propriedade && "value" in propriedade ? propriedade.value : undefined;
  return typeof codigo === "string" && (codigosBanco.has(codigo) || codigosInfraestrutura.has(codigo)) ? codigo : undefined;
}

/** Evento técnico mínimo, sem mensagem, stack, SQL, URL, payload ou identidade. */
export function registrarFalhaAcademica(res: Response, operacao: OperacaoAcademica, erro: unknown): void {
  const correlacaoId = randomUUID();
  const codigo = codigoPermitido(erro);
  res.setHeader("X-Request-ID", correlacaoId);
  console.error("[academico] falha interna", {
    evento: "FALHA_ACADEMICA", operacao, correlacaoId,
    classificacao: codigo ? (codigosBanco.has(codigo) ? "FALHA_BANCO" : "FALHA_INFRAESTRUTURA") : "FALHA_INTERNA",
    ...(codigo ? { codigo } : {}),
  });
}
