const TRANSPORTE = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

export function pontosEmCentesimos(valor: unknown): bigint {
  if (typeof valor !== "string" || TRANSPORTE.exec(valor)?.[0] !== valor) {
    throw new Error("Informe pontos com até duas casas decimais, sem sinais ou agrupamento.");
  }
  const [inteiro, fracao = ""] = valor.split(".");
  return BigInt(inteiro) * 100n + BigInt(fracao.padEnd(2, "0"));
}

function formatarCentesimos(valor: bigint): string {
  return `${valor / 100n}.${(valor % 100n).toString().padStart(2, "0")}`;
}

/** Converte somente o separador digitado; valida antes de qualquer cálculo. */
export function pontosParaApi(entrada: unknown, opcoes: { positivo?: boolean } = {}): string {
  if (typeof entrada !== "string") throw new Error("Informe os pontos em texto.");
  const centesimos = pontosEmCentesimos(entrada.replace(",", "."));
  if (opcoes.positivo && centesimos === 0n) throw new Error("Os pontos devem ser maiores que zero.");
  return formatarCentesimos(centesimos);
}

export function formatarPontos(valor: string | null | undefined, ausente = "-"): string {
  if (valor == null) return ausente;
  const [inteiro, fracao] = formatarCentesimos(pontosEmCentesimos(valor)).split(".");
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fracao}`;
}

export function somarPontosApi(valores: string[]): string {
  let total = 0n;
  for (const valor of valores) total += pontosEmCentesimos(valor);
  return formatarCentesimos(total);
}

export function compararPontosApi(a: string, b: string): -1 | 0 | 1 {
  const primeiro = pontosEmCentesimos(a);
  const segundo = pontosEmCentesimos(b);
  return primeiro === segundo ? 0 : primeiro < segundo ? -1 : 1;
}
