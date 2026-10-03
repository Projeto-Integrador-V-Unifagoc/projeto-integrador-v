import { describe, expect, it } from "vitest";
import {
  compararPontos,
  ErroPontos,
  formatarPontos,
  parsePontos,
  somarPontos,
} from "./Pontos";

function esperarErro(
  valor: unknown,
  codigo: "VALOR_INVALIDO" | "PRECISAO_INVALIDA",
  opcoes?: { positivo?: boolean; campo?: string },
) {
  let erro: unknown;
  try {
    parsePontos(valor, opcoes);
  } catch (capturado) {
    erro = capturado;
  }
  expect(erro).toBeInstanceOf(ErroPontos);
  expect(erro).toMatchObject({ codigo });
}

describe("parsePontos", () => {
  it.each([
    { texto: "0", centesimos: 0n },
    { texto: "0.0", centesimos: 0n },
    { texto: "0.00", centesimos: 0n },
    { texto: "0.01", centesimos: 1n },
    { texto: "1", centesimos: 100n },
    { texto: "1.2", centesimos: 120n },
    { texto: "1.23", centesimos: 123n },
    { texto: "18.00", centesimos: 1800n },
    { texto: "100.01", centesimos: 10001n },
    { texto: "300", centesimos: 30000n },
  ])("converte $texto em centésimos exatos", ({ texto, centesimos }) => {
    const resultado = parsePontos(texto);
    expect(typeof resultado).toBe("bigint");
    expect(resultado).toBe(centesimos);
  });

  const invalidos: Array<{ nome: string; valor: unknown }> = [
    { nome: "número JSON inteiro", valor: 1 },
    { nome: "número JSON decimal", valor: 18.5 },
    { nome: "número JSON zero", valor: 0 },
    { nome: "null", valor: null },
    { nome: "undefined", valor: undefined },
    { nome: "booleano", valor: false },
    { nome: "bigint direto", valor: 100n },
    { nome: "array", valor: ["1.00"] },
    { nome: "objeto String", valor: new String("1.00") },
    { nome: "objeto com conversão proibida", valor: { toString() { throw new Error("Não coagir entrada"); } } },
    { nome: "string vazia", valor: "" },
    { nome: "sinal positivo", valor: "+1" },
    { nome: "sinal negativo", valor: "-1" },
    { nome: "zero negativo", valor: "-0.00" },
    { nome: "expoente", valor: "1e2" },
    { nome: "expoente com maiúscula", valor: "1E+2" },
    { nome: "vírgula decimal", valor: "1,23" },
    { nome: "agrupamento pt-BR", valor: "1.234,56" },
    { nome: "agrupamento en-US", valor: "1,234.56" },
    { nome: "espaço inicial", valor: " 1.00" },
    { nome: "espaço final", valor: "1.00 " },
    { nome: "espaço interno", valor: "1 000.00" },
    { nome: "tabulação", valor: "\t1.00" },
    { nome: "quebra de linha final", valor: "1.00\n" },
    { nome: "quebra de linha inicial", valor: "\n1.00" },
    { nome: "zero à esquerda", valor: "01" },
    { nome: "zeros à esquerda decimais", valor: "00.01" },
    { nome: "zero à esquerda e precisão excedente", valor: "01.000" },
    { nome: "decimal sem parte inteira", valor: ".50" },
    { nome: "separador sem fração", valor: "1." },
    { nome: "notação hexadecimal", valor: "0x10" },
    { nome: "NaN textual", valor: "NaN" },
    { nome: "Infinity textual", valor: "Infinity" },
    { nome: "dígitos fora de ASCII", valor: "１２.３４" },
  ];

  it.each(invalidos)("rejeita $nome sem coagir ou normalizar", ({ valor }) => {
    esperarErro(valor, "VALOR_INVALIDO");
  });

  it.each(["1.000", "0.001", "1.234", "99.9999", "12.340", "0.0000"])(
    "rejeita precisão excedente de %s sem arredondar ou remover zeros",
    (valor) => esperarErro(valor, "PRECISAO_INVALIDA"),
  );

  it.each(["0", "0.0", "0.00"])("rejeita %s quando o campo exige positividade", (valor) => {
    esperarErro(valor, "VALOR_INVALIDO", { positivo: true, campo: "totalPontos" });
  });

  it("aceita o menor centésimo positivo e permite zero explicitamente", () => {
    expect(parsePontos("0.01", { positivo: true })).toBe(1n);
    expect(parsePontos("0.00", { positivo: false })).toBe(0n);
  });

  it("preserva centésimos acima de Number.MAX_SAFE_INTEGER", () => {
    expect(parsePontos("90071992547409.93")).toBe(9007199254740993n);
    expect(parsePontos("9007199254740993.01")).toBe(900719925474099301n);
  });

  it("não impõe teto acadêmico arbitrário a strings exatas", () => {
    expect(parsePontos("123456789012345678901234567890.12", { positivo: true }))
      .toBe(12345678901234567890123456789012n);
  });
});

describe("formatarPontos", () => {
  it.each([
    { centesimos: 0n, texto: "0.00" },
    { centesimos: 1n, texto: "0.01" },
    { centesimos: 9n, texto: "0.09" },
    { centesimos: 10n, texto: "0.10" },
    { centesimos: 99n, texto: "0.99" },
    { centesimos: 100n, texto: "1.00" },
    { centesimos: 101n, texto: "1.01" },
    { centesimos: 1800n, texto: "18.00" },
    { centesimos: 10001n, texto: "100.01" },
    { centesimos: 900719925474099301n, texto: "9007199254740993.01" },
    { centesimos: 12345678901234567890123456789012n, texto: "123456789012345678901234567890.12" },
  ])("formata $centesimos em $texto sem perder precisão", ({ centesimos, texto }) => {
    expect(formatarPontos(centesimos)).toBe(texto);
  });
});

describe("somarPontos", () => {
  it("soma decimais exatos em centésimos", () => {
    const total = somarPontos([parsePontos("0.10"), parsePontos("0.20"), parsePontos("0.01")]);
    expect(total).toBe(31n);
    expect(formatarPontos(total)).toBe("0.31");
  });

  it("retorna zero para coleção vazia", () => {
    expect(somarPontos([])).toBe(0n);
  });

  it("aceita um iterável de consumo único", () => {
    function* centesimos() {
      yield 7200n;
      yield 600n;
      yield 4200n;
    }
    expect(somarPontos(centesimos())).toBe(12000n);
  });

  it("preserva a unidade acima do limite de precisão de Number", () => {
    expect(somarPontos([900719925474099301n, 1n])).toBe(900719925474099302n);
  });
});

describe("compararPontos", () => {
  it.each([
    { a: 0n, b: 0n, esperado: 0 },
    { a: 1n, b: 100n, esperado: -1 },
    { a: 100n, b: 1n, esperado: 1 },
    { a: 100n, b: 100n, esperado: 0 },
    { a: 900719925474099301n, b: 900719925474099302n, esperado: -1 },
    { a: 900719925474099302n, b: 900719925474099301n, esperado: 1 },
    { a: 900719925474099301n, b: 900719925474099301n, esperado: 0 },
  ])("compara $a e $b retornando $esperado", ({ a, b, esperado }) => {
    expect(compararPontos(a, b)).toBe(esperado);
  });
});

describe("transporte JSON de pontos", () => {
  it("serializa somente strings formatadas e mantém ausência distinta de zero", () => {
    const resposta = {
      totalPontos: formatarPontos(parsePontos("9007199254740993.01")),
      pontosObtidos: formatarPontos(parsePontos("0")),
      notaPendente: null,
    };
    const json = JSON.stringify(resposta);
    expect(json).toBe('{"totalPontos":"9007199254740993.01","pontosObtidos":"0.00","notaPendente":null}');
    expect(JSON.parse(json)).toEqual(resposta);
  });
});
