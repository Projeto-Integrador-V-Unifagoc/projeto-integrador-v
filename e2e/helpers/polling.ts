/**
 * Espera ativa por uma condição observável, sem `waitForTimeout` fixo (spec §13).
 * Reavalia `condicao` até retornar verdadeiro ou estourar o tempo limite.
 */
export async function aguardarAte<T>(
  condicao: () => Promise<T | null | undefined | false>,
  opcoes: { timeoutMs?: number; intervaloMs?: number; descricao?: string } = {},
): Promise<T> {
  const { timeoutMs = 10_000, intervaloMs = 150, descricao = "condição" } = opcoes;
  const limite = Date.now() + timeoutMs;
  let ultimoErro: unknown;
  while (Date.now() < limite) {
    try {
      const resultado = await condicao();
      if (resultado) return resultado as T;
    } catch (erro) {
      ultimoErro = erro;
    }
    await new Promise((r) => setTimeout(r, intervaloMs));
  }
  throw new Error(
    `Tempo esgotado aguardando ${descricao} (${timeoutMs}ms).` +
      (ultimoErro ? ` Último erro: ${String(ultimoErro)}` : ""),
  );
}
