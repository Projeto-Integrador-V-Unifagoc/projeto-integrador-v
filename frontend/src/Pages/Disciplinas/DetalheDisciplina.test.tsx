import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { disciplinaApi } from "../../services/disciplina-api";
import DetalheDisciplina from "./DetalheDisciplina";

vi.mock("../../services/disciplina-api", () => ({
  disciplinaApi: {
    buscarDisciplinaPorId: vi.fn(),
  },
}));

describe("DetalheDisciplina", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("apresenta os dados acadêmicos e as competências planejadas", async () => {
    vi.mocked(disciplinaApi.buscarDisciplinaPorId).mockResolvedValue({
      id: "disciplina-1",
      codigo: "ADS1A-AUD",
      nome: "Algoritmos e Lógica de Programação",
      carga_horaria: 100,
      area_conhecimento: "COMPUTACAO",
      ementa: "Construção de algoritmos e resolução estruturada de problemas.",
      carga_horaria_teorica: 60,
      carga_horaria_pratica: 20,
      carga_horaria_laboratorio: 20,
      carga_horaria_extensao: 0,
      pre_requisito: "Fundamentos de computação",
      observacoes: "Usar laboratório nas atividades práticas.",
      ativo: true,
      cadastro_completo: true,
      competencias: [{
        id: "vinculo-1",
        competencia_id: "competencia-1",
        codigo: "COMP-ALG-01",
        nome: "Elaborar algoritmos",
        descricao: "Resolver problemas por meio de algoritmos estruturados.",
        tipo: "TECNICA",
        ativo: true,
        nivel_esperado: "DESENVOLVER",
        obrigatoria: true,
        ordem: 0,
      }],
    });

    render(
      <MemoryRouter initialEntries={["/disciplinas/disciplina-1/detalhes"]}>
        <Routes>
          <Route path="/disciplinas/:id/detalhes" element={<DetalheDisciplina />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Algoritmos e Lógica de Programação" })).toBeInTheDocument();
    expect(screen.getByText("Construção de algoritmos e resolução estruturada de problemas.")).toBeInTheDocument();
    expect(screen.getByText("100 de 100 horas")).toBeInTheDocument();
    expect(screen.getByText("Elaborar algoritmos")).toBeInTheDocument();
    expect(screen.getByText("Nível: Desenvolver")).toBeInTheDocument();
    expect(screen.getByText("Usar laboratório nas atividades práticas.")).toBeInTheDocument();
  });
});
