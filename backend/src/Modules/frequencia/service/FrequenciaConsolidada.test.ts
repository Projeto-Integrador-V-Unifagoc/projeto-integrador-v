import { describe, expect, it } from "vitest";
import { consolidarFrequencia } from "./FrequenciaConsolidada";

describe("consolidarFrequencia - fórmula e faixas vigentes", () => {
  it("sem registros mantém frequência pendente, sem presumir 100%", () => {
    expect(consolidarFrequencia(0, 0)).toEqual({
      presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE",
    });
  });

  it.each([
    [0, 4, 0, "RISCO_REPROVACAO", "INSUFICIENTE"],
    [1, 2, 33.33, "RISCO_REPROVACAO", "INSUFICIENTE"],
    [2, 1, 66.67, "RISCO_REPROVACAO", "INSUFICIENTE"],
    [74, 26, 74, "RISCO_REPROVACAO", "INSUFICIENTE"],
    [3, 1, 75, "ALERTA", "SUFICIENTE"],
    [4, 1, 80, "ALERTA", "SUFICIENTE"],
    [81, 19, 81, "REGULAR", "SUFICIENTE"],
    [3, 0, 100, "REGULAR", "SUFICIENTE"],
  ] as const)("preserva %i presenças e %i faltas: %s%%", (presencas, faltas, percentual, situacao, requisito) => {
    expect(consolidarFrequencia(presencas, faltas)).toEqual({ presencas, faltas, percentual, situacao, requisito });
  });

  it("classifica o percentual arredondado como o serviço vigente na fronteira de 75%", () => {
    expect(consolidarFrequencia(299999, 100001)).toEqual({
      presencas: 299999, faltas: 100001, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE",
    });
  });

  it("mantém alerta quando o percentual arredondado ainda é 80%", () => {
    expect(consolidarFrequencia(800001, 199999)).toEqual({
      presencas: 800001, faltas: 199999, percentual: 80, situacao: "ALERTA", requisito: "SUFICIENTE",
    });
  });
});
