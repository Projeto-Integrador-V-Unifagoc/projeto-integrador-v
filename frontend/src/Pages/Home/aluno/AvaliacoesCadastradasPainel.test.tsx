import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AvaliacoesCadastradasPainel from "./AvaliacoesCadastradasPainel";
import type { AvaliacaoPainel } from "./regras-dashboard-aluno";

const avaliacao: AvaliacaoPainel = {
  id: "av1",
  turmaDisciplinaId: "td-banco",
  titulo: "Prova 1",
  tipo: "PROVA",
  disciplinaNome: "Banco de Dados",
  valorMaximo: 30,
  lancada: false,
  dataDevolucao: "2026-11-08",
  diasParaDevolucao: -8,
  devolucaoVencida: true,
};

afterEach(() => cleanup());

describe("AvaliacoesCadastradasPainel", () => {
  it("a linha abre a disciplina da avaliação e o cabeçalho abre a agenda", () => {
    const onAbrirDisciplina = vi.fn();
    const onConsultar = vi.fn();
    render(
      <AvaliacoesCadastradasPainel
        avaliacoes={[avaliacao]}
        resumo={{ total: 1, lancadas: 0, aguardando: 0, vencidas: [avaliacao] }}
        onConsultar={onConsultar}
        onAbrirDisciplina={onAbrirDisciplina}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Abrir Prova 1 · Banco de Dados" }));
    expect(onAbrirDisciplina).toHaveBeenCalledWith("td-banco");
    expect(onConsultar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ver agenda" }));
    expect(onConsultar).toHaveBeenCalledOnce();
  });
});
