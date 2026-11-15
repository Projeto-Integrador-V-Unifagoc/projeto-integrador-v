import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import Sidebar from "./Sidebar";

function renderizar(perfil: string, rota: string) {
  localStorage.setItem("@UniEduca:user", JSON.stringify({ tipo_usuario: perfil }));
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Sidebar expandido />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("organiza o menu administrativo em categorias recolhíveis", async () => {
    renderizar("administrador", "/disciplinas/lista");

    expect(screen.getByRole("button", { name: "Estrutura acadêmica" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Disciplinas" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Alunos" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pessoas e vínculos" }));
    expect(screen.getByRole("button", { name: "Estrutura acadêmica" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Disciplinas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alunos" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pessoas e vínculos" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Alunos" })).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Disciplinas" })).toBeInTheDocument();
  });

  it("abre somente o grupo da página atual e destaca o item selecionado", () => {
    renderizar("administrador", "/alunos/lista");

    expect(screen.getByRole("button", { name: "Estrutura acadêmica" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Pessoas e vínculos" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("link", { name: "Cursos" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alunos" })).toHaveClass("Mui-selected");
  });

  it("mantém somente os grupos permitidos para professor", () => {
    renderizar("professor", "/notas/lancamento");

    expect(screen.getByRole("button", { name: "Ensino" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Lançamento de Notas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Estrutura acadêmica" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Usuários" })).not.toBeInTheDocument();
  });
});
