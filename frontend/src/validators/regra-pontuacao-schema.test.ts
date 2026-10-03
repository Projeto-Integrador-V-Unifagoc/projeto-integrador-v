import { describe, expect, it } from "vitest";
import { ValidationError } from "yup";
import { prepararRegraPontuacao, regraPontuacaoSchema } from "./regra-pontuacao-schema";
import type { RascunhoRegraPontuacao, SalvarRegraPontuacaoRequest } from "../models/regra-pontuacao-model";

function rascunho(quantidade = "1"): RascunhoRegraPontuacao {
  return { totalPontos: "100,01", subgrupos: [{
    chave: "local", nome: "Projetos", orcamentoPontos: "100,01", modoQuantidade: "FIXA", quantidadeFixa: quantidade,
  }] };
}

function payload(): SalvarRegraPontuacaoRequest {
  return { versaoEsperada: null, totalPontos: "100.01", subgrupos: [{
    nome: "Projetos", orcamentoPontos: "100.01", modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 0,
  }] };
}

describe("regraPontuacaoSchema - limites e conversão do rascunho", () => {
  it("aceita o máximo integer do PostgreSQL sem mudar centésimos", () => {
    expect(prepararRegraPontuacao(rascunho("2147483647"), null)).toEqual({
      ...payload(), subgrupos: [{ ...payload().subgrupos[0], quantidadeFixa: 2_147_483_647 }],
    });
  });

  it.each(["2147483648", "9007199254740992"])("rejeita quantidade fixa fora do integer %s antes de enviar", (quantidade) => {
    expect(() => prepararRegraPontuacao(rascunho(quantidade), null)).toThrow(ValidationError);
  });

  it.each(["1\n", "1\r", "1\r\n", "1\u2028", " 1", "1 "])("rejeita quantidade com caractere extra %j sem trim ou fullmatch parcial", (quantidade) => {
    expect(() => prepararRegraPontuacao(rascunho(quantidade), null)).toThrow(ValidationError);
  });

  it("valida o máximo integer também no payload JSON já convertido", () => {
    const entrada = payload(); entrada.subgrupos[0].quantidadeFixa = 2_147_483_648;
    expect(() => regraPontuacaoSchema.validateSync(entrada, { strict: true })).toThrow(ValidationError);
  });

  it.each([Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, 1.5, 0, -1])("rejeita versão explícita inválida %s", (versaoEsperada) => {
    expect(() => regraPontuacaoSchema.validateSync({ ...payload(), versaoEsperada }, { strict: true })).toThrow(ValidationError);
  });

  it.each([Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, 1.5, -1])("rejeita ordem explícita inválida %s", (ordem) => {
    const entrada = payload(); entrada.subgrupos[0].ordem = ordem;
    expect(() => regraPontuacaoSchema.validateSync(entrada, { strict: true })).toThrow(ValidationError);
  });

  it("aceita versão inteira segura e ordem zero", () => {
    const entrada = { ...payload(), versaoEsperada: 7 };
    expect(regraPontuacaoSchema.validateSync(entrada, { strict: true })).toEqual(entrada);
  });

  it("mantém pontos grandes textuais exatos durante preparação e soma", () => {
    const entrada = rascunho();
    entrada.totalPontos = "9007199254740993,01";
    entrada.subgrupos[0].orcamentoPontos = "9007199254740993,01";
    const pronta = prepararRegraPontuacao(entrada, null);
    expect(pronta.totalPontos).toBe("9007199254740993.01");
    expect(pronta.subgrupos[0].orcamentoPontos).toBe("9007199254740993.01");
  });
});
