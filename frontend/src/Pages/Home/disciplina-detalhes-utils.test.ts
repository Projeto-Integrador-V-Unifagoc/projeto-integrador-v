import { describe, expect, it } from "vitest";
import type { DisciplinaBoletim } from "../../models/nota-model";
import {
  calcularProjecaoFrequencia,
  calcularProjecaoNota,
} from "./disciplina-detalhes-utils";

function boletim(
  pontosObtidos: number,
  avaliacoes: DisciplinaBoletim["avaliacoes"],
): DisciplinaBoletim {
  return {
    turmaDisciplinaId: "td-1",
    disciplina: { id: "d-1", codigo: "PI-V", nome: "Projeto Integrador V" },
    disciplinaNome: "Projeto Integrador V",
    turmaSigla: "ADS5A",
    professorNome: "Professora",
    periodoLetivo: { id: "p-1", codigo: "2026.2" },
    pontosObtidos,
    pontosMaximos: 40,
    mediaParcial: 75,
    notaRecuperacao: null,
    mediaFinal: 75,
    situacao: "EM_ANDAMENTO",
    etapaRegularCompleta: false,
    elegivelRecuperacao: false,
    alerta: false,
    avaliacoes,
  };
}

const avaliacao = (
  id: string,
  valorMaximo: number,
  valorObtido: number | null,
): DisciplinaBoletim["avaliacoes"][number] => ({
  id,
  tipo: "PROVA",
  descricao: `Avaliação ${id}`,
  valorMaximo,
  valorObtido,
  lancada: valorObtido !== null,
});

describe("calcularProjecaoNota", () => {
  it("calcula os pontos e o aproveitamento necessários nas avaliações pendentes", () => {
    const resultado = calcularProjecaoNota(
      boletim(30, [avaliacao("1", 40, 30), avaliacao("2", 60, null)]),
    );

    expect(resultado).toMatchObject({
      situacao: "alcancavel",
      pontosDisponiveis: 60,
      pontosParaMeta: 30,
      percentualNecessario: 50,
    });
  });

  it("não apresenta projeção definitiva quando o plano ainda não totaliza 100 pontos", () => {
    expect(
      calcularProjecaoNota(boletim(20, [avaliacao("1", 40, 20)])),
    ).toMatchObject({ situacao: "plano-incompleto", totalPlanejado: 40 });
  });

  it("identifica meta atingida e cenário de recuperação", () => {
    expect(
      calcularProjecaoNota(
        boletim(65, [avaliacao("1", 60, 40), avaliacao("2", 40, 25)]),
      ),
    ).toMatchObject({ situacao: "meta-atingida", pontosParaMeta: 0 });

    expect(
      calcularProjecaoNota(
        boletim(55, [avaliacao("1", 100, 55)]),
      ),
    ).toMatchObject({ situacao: "recuperacao", pontosDisponiveis: 0 });
  });
});

describe("calcularProjecaoFrequencia", () => {
  it("calcula a margem de faltas mantendo pelo menos 75%", () => {
    expect(calcularProjecaoFrequencia(9, 1)).toEqual({
      margemFaltas: 2,
      presencasParaRecuperar: 0,
    });
  });

  it("calcula presenças consecutivas necessárias para voltar a 75%", () => {
    expect(calcularProjecaoFrequencia(7, 3)).toEqual({
      margemFaltas: 0,
      presencasParaRecuperar: 2,
    });
  });

  it("não projeta sem aulas registradas", () => {
    expect(calcularProjecaoFrequencia(0, 0)).toBeNull();
  });
});
