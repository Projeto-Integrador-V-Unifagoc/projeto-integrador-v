import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FichaAlunoNotasTabela } from "./FichaAlunoNotasTabela";
import type { NotaAluno } from "./types";

function criarNota(overrides: Partial<NotaAluno> = {}): NotaAluno {
  return {
    disciplina: "Calculo I",
    mediaFinal: 8.5,
    avaliacao: 8.5,
    avaliacoes: [],
    provaFinal: 0,
    provaInova: 0,
    provaSegundaChamada: 0,
    conhecimentosGerais: 0,
    faltas: 0,
    percentualFaltas: 0,
    ...overrides,
  };
}

describe("FichaAlunoNotasTabela", () => {
  it("mostra mensagem de vazio quando nao ha notas para o semestre selecionado", () => {
    render(<FichaAlunoNotasTabela notas={[]} semestre="2026-1" />);

    expect(
      screen.getByText("Nenhuma nota ou falta encontrada para o semestre selecionado."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renderiza uma linha por disciplina com media, faltas e percentual de faltas", () => {
    const notas = [
      criarNota({
        disciplina: "Calculo I",
        mediaFinal: 8.5,
        faltas: 4,
        percentualFaltas: 20,
      }),
      criarNota({
        disciplina: "Estrutura de Dados",
        mediaFinal: 6,
        faltas: 1,
        percentualFaltas: 5,
      }),
    ];

    render(<FichaAlunoNotasTabela notas={notas} semestre="2026-1" />);

    const linhaCalculo = screen.getByRole("row", { name: /Calculo I/ });
    expect(within(linhaCalculo).getByText("8,50")).toBeInTheDocument();
    expect(within(linhaCalculo).getByText("4")).toBeInTheDocument();
    expect(within(linhaCalculo).getByText("20,00%")).toBeInTheDocument();

    const linhaEstrutura = screen.getByRole("row", {
      name: /Estrutura de Dados/,
    });
    expect(within(linhaEstrutura).getByText("6,00")).toBeInTheDocument();
    expect(within(linhaEstrutura).getByText("5,00%")).toBeInTheDocument();
  });

  it("cria uma coluna por avaliacao e mostra a nota lancada para a disciplina correspondente", () => {
    const notas = [
      criarNota({
        disciplina: "Calculo I",
        avaliacoes: [
          { id: "a1", nome: "Entrega 1", nota: 9, peso: 1 },
        ],
      }),
      criarNota({
        disciplina: "Fisica I",
        mediaFinal: 7,
        avaliacoes: [],
      }),
    ];

    render(<FichaAlunoNotasTabela notas={notas} semestre="2026-1" />);

    expect(screen.getByRole("columnheader", { name: "Entrega 1" })).toBeInTheDocument();

    const linhaCalculo = screen.getByRole("row", { name: /Calculo I/ });
    expect(within(linhaCalculo).getByText("9,00")).toBeInTheDocument();

    const linhaFisica = screen.getByRole("row", { name: /Fisica I/ });
    expect(within(linhaFisica).getByText("-")).toBeInTheDocument();
  });

  it("mostra a contagem de disciplinas e o semestre selecionado no cabecalho", () => {
    const notas = [criarNota(), criarNota({ disciplina: "Fisica I" })];

    render(<FichaAlunoNotasTabela notas={notas} semestre="2026-1" />);

    expect(screen.getByText("2 disciplinas no semestre 2026-1")).toBeInTheDocument();
  });
});
