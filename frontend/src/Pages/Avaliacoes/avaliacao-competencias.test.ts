import { describe, expect, it } from "vitest";
import { somarPesosCompetencias, validarPesosCompetencias } from "./avaliacao-competencias";

describe("mapeamento de competências da avaliação", () => {
  it("mantém a compatibilidade quando nenhuma competência é informada", () => {
    expect(validarPesosCompetencias([])).toBeNull();
  });

  it("aceita pesos positivos que totalizam 100", () => {
    const competencias = [{ peso_percentual: 60 }, { peso_percentual: 40 }];
    expect(somarPesosCompetencias(competencias)).toBe(100);
    expect(validarPesosCompetencias(competencias)).toBeNull();
  });

  it("rejeita peso vazio, zero e soma diferente de 100", () => {
    expect(validarPesosCompetencias([{ peso_percentual: "" }, { peso_percentual: 100 }])).toMatch(/maiores que zero/);
    expect(validarPesosCompetencias([{ peso_percentual: 80 }])).toMatch(/totalizar exatamente 100/);
  });
});
