export type CodigoErroPontos = "VALOR_INVALIDO" | "PRECISAO_INVALIDA";

export class ErroPontos extends Error {
  readonly status = 400;

  constructor(
    public readonly codigo: CodigoErroPontos,
    mensagem: string,
    public readonly campo?: string,
  ) {
    super(mensagem);
    this.name = "ErroPontos";
  }
}

const TRANSPORTE = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const PRECISAO_EXCEDENTE = /^(0|[1-9][0-9]*)\.[0-9]{3,}$/;

function correspondeIntegralmente(padrao: RegExp, valor: string): boolean {
  // Em JavaScript, $ também casa antes de uma quebra de linha final.
  return padrao.exec(valor)?.[0] === valor;
}

/** Transporte decimal estrito -> centésimos exatos, sem coerção ou arredondamento. */
export function parsePontos(
  valor: unknown,
  opcoes: { positivo?: boolean; campo?: string } = {},
): bigint {
  if (typeof valor !== "string" || !correspondeIntegralmente(TRANSPORTE, valor)) {
    const precisao = typeof valor === "string" && correspondeIntegralmente(PRECISAO_EXCEDENTE, valor);
    throw new ErroPontos(
      precisao ? "PRECISAO_INVALIDA" : "VALOR_INVALIDO",
      precisao ? "Informe pontos com até duas casas decimais." : "Informe pontos em texto decimal válido.",
      opcoes.campo,
    );
  }
  const [inteiro, fracao = ""] = valor.split(".");
  const centesimos = BigInt(inteiro) * 100n + BigInt(fracao.padEnd(2, "0"));
  if (opcoes.positivo && centesimos === 0n) {
    throw new ErroPontos("VALOR_INVALIDO", "Os pontos devem ser maiores que zero.", opcoes.campo);
  }
  return centesimos;
}

/** Apenas esta projeção textual de pontos deve atravessar o transporte JSON. */
export function formatarPontos(centesimos: bigint): string {
  const negativo = centesimos < 0n;
  const absoluto = negativo ? -centesimos : centesimos;
  return `${negativo ? "-" : ""}${absoluto / 100n}.${(absoluto % 100n).toString().padStart(2, "0")}`;
}

export function somarPontos(valores: Iterable<bigint>): bigint {
  let total = 0n;
  for (const valor of valores) total += valor;
  return total;
}

export function compararPontos(a: bigint, b: bigint): -1 | 0 | 1 {
  return a === b ? 0 : a < b ? -1 : 1;
}
