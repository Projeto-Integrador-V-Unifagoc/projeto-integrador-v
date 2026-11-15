import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useConfirmacao } from "./use-confirmacao";

function ExemploConfirmacao() {
  const { confirmar, dialogoConfirmacao } = useConfirmacao();
  const [resultado, setResultado] = useState("pendente");

  const abrir = async () => {
    const confirmado = await confirmar({
      titulo: "Descartar alterações?",
      mensagem: "As mudanças não salvas serão perdidas.",
      textoConfirmar: "Descartar",
      cor: "warning",
    });
    setResultado(confirmado ? "confirmado" : "cancelado");
  };

  return (
    <>
      <button onClick={() => void abrir()}>Abrir confirmação</button>
      <output>{resultado}</output>
      {dialogoConfirmacao}
    </>
  );
}

describe("useConfirmacao", () => {
  afterEach(cleanup);

  it("resolve a confirmação pelo diálogo da aplicação", async () => {
    render(<ExemploConfirmacao />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir confirmação" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("As mudanças não salvas serão perdidas.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.getByText("confirmado")).toBeInTheDocument());
  });

  it("resolve como cancelado ao fechar o diálogo", async () => {
    render(<ExemploConfirmacao />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir confirmação" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.getByText("cancelado")).toBeInTheDocument());
  });
});
