import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "./Login";
import { NotificationProvider } from "../../components/Notificacao/NotificationProvider";
import { limparBloqueios, registrarBloqueio } from "../../services/limite-requisicoes";
import { authService } from "../../services/auth-services";

// Caixa do reCAPTCHA trocada por um botão que entrega o token.
vi.mock("../../components/RecaptchaCheckbox", () => ({
    default: ({ onChange }: { onChange: (token: string) => void }) => (
        <button type="button" onClick={() => onChange("token")}>recaptcha</button>
    ),
}));

vi.mock("../../services/auth-services", () => ({
    authService: { login: vi.fn() },
}));

function renderizar() {
    render(
        <MemoryRouter>
            <NotificationProvider>
                <Login />
            </NotificationProvider>
        </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("recaptcha"));
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    limparBloqueios();
    vi.useRealTimers();
    vi.mocked(authService.login).mockReset();
});

describe("Login com limite de requisições", () => {
    it("desabilita o botão com contagem regressiva enquanto POST /login está bloqueado", () => {
        renderizar();
        expect(screen.getByRole("button", { name: "Acessar" })).toBeEnabled();

        act(() => registrarBloqueio("POST /login", 90, "Muitas tentativas de login."));
        expect(screen.getByRole("button", { name: "Tente novamente em 2 minutos" })).toBeDisabled();

        act(() => vi.advanceTimersByTime(60_000));
        expect(screen.getByRole("button", { name: "Tente novamente em 30 segundos" })).toBeDisabled();

        act(() => vi.advanceTimersByTime(30_000));
        expect(screen.getByRole("button", { name: "Acessar" })).toBeEnabled();
    });

    it("não envia o formulário durante o bloqueio", () => {
        renderizar();
        act(() => registrarBloqueio("POST /login", 10, "Muitas tentativas de login."));

        fireEvent.submit(screen.getByRole("button", { name: /Tente novamente/ }).closest("form")!);

        expect(authService.login).not.toHaveBeenCalled();
    });
});
