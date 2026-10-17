import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NotificationProvider } from "./NotificationProvider";
import { limparBloqueios, registrarBloqueio } from "../../services/limite-requisicoes";

afterEach(() => {
    cleanup();
    limparBloqueios();
});

describe("NotificationProvider: aviso de limite de requisições", () => {
    it("mostra um aviso quando a API inteira fica limitada", () => {
        render(<NotificationProvider><p>conteúdo</p></NotificationProvider>);

        act(() => registrarBloqueio("GET /alunos", 30, "Muitas solicitações em pouco tempo.", true));

        const alerta = screen.getByRole("alert");
        expect(alerta).toHaveTextContent("Muitas solicitações em pouco tempo.");
        expect(alerta).toHaveClass("MuiAlert-filledWarning");
    });

    it("não avisa no bloqueio de uma rota só (a própria tela trata)", () => {
        render(<NotificationProvider><p>conteúdo</p></NotificationProvider>);

        act(() => registrarBloqueio("POST /login", 30, "Muitas tentativas de login."));

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
