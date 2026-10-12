import { describe, expect, it } from "vitest";
import {
  compararPontosApi,
  formatarPontos,
  pontosEmCentesimos,
  pontosParaApi,
  somarPontosApi,
} from "./pontos";

// Digitação admite um separador decimal local; transporte REST aceita só ponto.
// Nenhum desses helpers decide aprovação ou elegibilidade acadêmica.
const ENTRADAS_INVALIDAS: unknown[] = [
  undefined,
  null,
  0,
  18.5,
  NaN,
  Infinity,
  0n,
  false,
  {},
  ["18.50"],
  { toString: () => "18.50" },
  "",
  " ",
  "\t\n",
  " 18.50",
  "18.50 ",
  "18\u00a0",
  "1 000",
  "+18.50",
  "-18.50",
  "+0",
  "-0.00",
  "1e2",
  "1E+2",
  "NaN",
  "Infinity",
  "00",
  "01",
  "00.00",
  "01.50",
  ".50",
  ",50",
  "18.",
  "18,",
  "18.501",
  "18,501",
  "0.001",
  "1.000",
  "1,000",
  "1.000,00",
  "1,000.00",
  "18..50",
  "18,,50",
  "18,5.0",
  "18.5,0",
  "１８.５０",
];

describe("pontosParaApi - digitação textual pt-BR", () => {
  it.each([
    ["0", "0.00"],
    ["0,0", "0.00"],
    ["0.00", "0.00"],
    ["0,01", "0.01"],
    ["18", "18.00"],
    ["18,5", "18.50"],
    ["18.5", "18.50"],
    ["18,50", "18.50"],
    ["18.50", "18.50"],
    ["1000,99", "1000.99"],
  ])("normaliza %s para %s sem arredondar", (entrada, esperado) => {
    expect(pontosParaApi(entrada)).toBe(esperado);
  });

  it.each(ENTRADAS_INVALIDAS)("rejeita entrada inválida (%#)", (entrada) => {
    expect(() => pontosParaApi(entrada)).toThrow();
  });

  it.each(["0", "0.0", "0,0", "0.00", "0,00"])(
    "rejeita zero %s quando o campo exige valor positivo",
    (entrada) => {
      expect(() => pontosParaApi(entrada, { positivo: true })).toThrow();
    },
  );

  it("permite o menor centésimo positivo e zero quando positividade não é exigida", () => {
    expect(pontosParaApi("0,01", { positivo: true })).toBe("0.01");
    expect(pontosParaApi("0,00", { positivo: false })).toBe("0.00");
  });

  it("preserva inteiros e centésimos acima de Number.MAX_SAFE_INTEGER", () => {
    expect(pontosParaApi("9007199254740993,01")).toBe("9007199254740993.01");
    expect(pontosParaApi("123456789012345678901234567890,99", { positivo: true }))
      .toBe("123456789012345678901234567890.99");
  });
});

describe("pontosEmCentesimos - transporte REST estrito", () => {
  it.each([
    ["0", 0n],
    ["0.0", 0n],
    ["0.00", 0n],
    ["0.01", 1n],
    ["18", 1800n],
    ["18.0", 1800n],
    ["18.5", 1850n],
    ["18.50", 1850n],
    ["100.01", 10001n],
    ["9007199254740993.01", 900719925474099301n],
    ["123456789012345678901234567890.99", 12345678901234567890123456789099n],
  ] as const)("converte %s em centésimos exatos", (entrada, esperado) => {
    expect(pontosEmCentesimos(entrada)).toBe(esperado);
  });

  it.each([...ENTRADAS_INVALIDAS, "0,00", "18,5", "18,50"])(
    "rejeita entrada fora do contrato REST (%#)",
    (entrada) => {
      expect(() => pontosEmCentesimos(entrada)).toThrow();
    },
  );
});

describe("formatarPontos - apresentação pt-BR", () => {
  it.each([
    ["0", "0,00"],
    ["0.00", "0,00"],
    ["0.01", "0,01"],
    ["18", "18,00"],
    ["18.5", "18,50"],
    ["18.50", "18,50"],
    ["999.99", "999,99"],
    ["1234.50", "1.234,50"],
    ["1000000.01", "1.000.000,01"],
    ["9007199254740993.01", "9.007.199.254.740.993,01"],
    ["123456789012345678901234567890.99", "123.456.789.012.345.678.901.234.567.890,99"],
  ])("formata %s como %s sem perder precisão", (valor, esperado) => {
    expect(formatarPontos(valor)).toBe(esperado);
  });

  it.each([null, undefined])("distingue ausência %s de zero lançado", (valor) => {
    expect(formatarPontos(valor)).toBe("-");
    expect(formatarPontos(valor, "Sem lançamento")).toBe("Sem lançamento");
    expect(formatarPontos("0.00", "Sem lançamento")).toBe("0,00");
  });

  it.each(["", " ", "18,50", "18.501", "01.50", "1e2", "1.000,00"])(
    "rejeita REST inválido em vez de tratá-lo como ausência (%#)",
    (valor) => {
      expect(() => formatarPontos(valor)).toThrow();
    },
  );
});

describe("somarPontosApi - aritmética exata", () => {
  it.each([
    [[], "0.00"],
    [["0", "0.00"], "0.00"],
    [["18.5"], "18.50"],
    [["0.1", "0.2"], "0.30"],
    [["0.99", "0.01"], "1.00"],
    [["12.00", "18.00", "18.00", "24.00"], "72.00"],
    [["9007199254740993.01", "0.01", "0.98"], "9007199254740994.00"],
    [["123456789012345678901234567890.99", "0.01"], "123456789012345678901234567891.00"],
  ] as const)("soma os valores sem arredondar (%#)", (valores, esperado) => {
    expect(somarPontosApi([...valores])).toBe(esperado);
  });

  it.each(["18,50", "0.001", "", "01.50"])(
    "rejeita qualquer item fora do contrato REST (%#)",
    (invalido) => {
      expect(() => somarPontosApi(["0.01", invalido, "0.02"])).toThrow();
    },
  );
});

describe("compararPontosApi - comparação exata sem classificar resultado acadêmico", () => {
  it.each([
    ["0", "0.00", 0],
    ["18.5", "18.50", 0],
    ["9.99", "10.00", -1],
    ["10.00", "9.99", 1],
    ["0.01", "0.02", -1],
    ["0.02", "0.01", 1],
    ["9007199254740993.01", "9007199254740993.02", -1],
    ["9007199254740993.02", "9007199254740993.01", 1],
    ["123456789012345678901234567890.99", "123456789012345678901234567890.99", 0],
  ] as const)("compara %s e %s com retorno %s", (a, b, esperado) => {
    expect(compararPontosApi(a, b)).toBe(esperado);
  });

  it.each(["18,50", "0.001", "", "01.50"])(
    "valida ambos os operandos REST (%#)",
    (invalido) => {
      expect(() => compararPontosApi(invalido, "18.50")).toThrow();
      expect(() => compararPontosApi("18.50", invalido)).toThrow();
    },
  );
});
