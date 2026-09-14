/**
 * Extrai uma mensagem legível de um valor capturado em `catch (erro: unknown)`.
 * Usado nos controllers para responder o erro sem recorrer a `any`.
 */
export function mensagemDeErro(erro: unknown, padrao = "Erro inesperado."): string {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === "string") return erro;
  return padrao;
}

/** Formato mínimo de um erro de driver de banco (pg): usado para traduzir violações de FK/constraint. */
export interface ErroBancoDados {
  code?: string;
  constraint?: string;
  message?: string;
  detail?: string;
}

/** Narrowing seguro de `catch (erro: unknown)` para inspecionar campos de erro do driver pg. */
export function comoErroBancoDados(erro: unknown): ErroBancoDados {
  return typeof erro === "object" && erro !== null ? (erro as ErroBancoDados) : {};
}
