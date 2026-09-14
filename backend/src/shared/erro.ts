/**
 * Extrai uma mensagem legível de um valor capturado em `catch (erro: unknown)`.
 * Usado nos controllers para responder o erro sem recorrer a `any`.
 */
export function mensagemDeErro(erro: unknown, padrao = "Erro inesperado."): string {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === "string") return erro;
  return padrao;
}
