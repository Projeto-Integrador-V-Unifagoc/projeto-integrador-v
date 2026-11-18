import { describe, expect, it } from "vitest";
import type { DisciplinaView } from "../../models/disciplina-model";
import { estadoCadastroDisciplina, filtrarDisciplinas } from "./disciplina-filters";

const itens: DisciplinaView[] = [
  { id: "1", codigo: "ALG", nome: "Algoritmos", cargaHoraria: 60, areaConhecimento: "COMPUTACAO", quantidadeCompetencias: 2, cadastroCompleto: true, ativo: true },
  { id: "2", codigo: "MAT", nome: "Cálculo", cargaHoraria: 60, areaConhecimento: "MATEMATICA", quantidadeCompetencias: 0, cadastroCompleto: true, ativo: true },
  { id: "3", codigo: "LEG", nome: "Legada", cargaHoraria: 40, quantidadeCompetencias: 0, cadastroCompleto: false, ativo: false },
];

describe("filtros de disciplina", () => {
  it("diferencia dados pendentes de ausência de competências", () => {
    expect(estadoCadastroDisciplina(itens[1])).toBe("SEM_COMPETENCIAS");
    expect(estadoCadastroDisciplina(itens[2])).toBe("PENDENTE_DADOS");
  });

  it("combina pesquisa, área e situação", () => {
    expect(filtrarDisciplinas(itens, { busca: "alg", area: "COMPUTACAO", situacao: "ATIVAS", completude: "COMPLETAS" })).toEqual([itens[0]]);
  });
});
