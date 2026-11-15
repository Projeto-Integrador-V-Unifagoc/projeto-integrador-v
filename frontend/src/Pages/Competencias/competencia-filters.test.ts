import { describe, expect, it } from "vitest";
import type { CompetenciaResponse } from "../../models/disciplina-model";
import { filtrarCompetencias } from "./competencia-filters";

const itens: CompetenciaResponse[] = [
  { id: "1", codigo: "COMP-ALG", nome: "Raciocínio lógico", descricao: "Resolve problemas", tipo: "TECNICA", ativo: true },
  { id: "2", codigo: "COMP-COM", nome: "Comunicação", descricao: "Comunica ideias", tipo: "SOCIOEMOCIONAL", ativo: false },
];

describe("filtrarCompetencias", () => {
  it("pesquisa sem diferenciar acentos", () => {
    expect(filtrarCompetencias(itens, { busca: "raciocinio", tipo: "TODOS", situacao: "TODAS" })).toEqual([itens[0]]);
  });

  it("combina tipo e situação", () => {
    expect(filtrarCompetencias(itens, { busca: "", tipo: "SOCIOEMOCIONAL", situacao: "INATIVAS" })).toEqual([itens[1]]);
  });
});
