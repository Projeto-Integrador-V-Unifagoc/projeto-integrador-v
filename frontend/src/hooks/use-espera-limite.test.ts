import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEsperaLimite } from "./use-espera-limite";
import { limparBloqueios, registrarBloqueio } from "../services/limite-requisicoes";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    limparBloqueios();
    vi.useRealTimers();
});

describe("useEsperaLimite", () => {
    it("começa em 0 sem bloqueio e reage ao evento de bloqueio da rota", () => {
        const { result } = renderHook(() => useEsperaLimite("POST /login"));
        expect(result.current).toBe(0);

        act(() => registrarBloqueio("POST /login", 5, "Aguarde."));
        expect(result.current).toBe(5);
    });

    it("faz a contagem regressiva a cada segundo até liberar", () => {
        registrarBloqueio("POST /login", 3, "Aguarde.");
        const { result } = renderHook(() => useEsperaLimite("POST /login"));
        expect(result.current).toBe(3);

        act(() => vi.advanceTimersByTime(1000));
        expect(result.current).toBe(2);

        act(() => vi.advanceTimersByTime(2000));
        expect(result.current).toBe(0);

        // Liberado, não sobra intervalo rodando.
        expect(vi.getTimerCount()).toBe(0);
    });

    it("ignora bloqueios de outras rotas, mas respeita o global", () => {
        const { result } = renderHook(() => useEsperaLimite("POST /login"));

        act(() => registrarBloqueio("POST /recuperacao-senha", 10, "Aguarde."));
        expect(result.current).toBe(0);

        act(() => registrarBloqueio("GET /alunos", 7, "Aguarde.", true));
        expect(result.current).toBe(7);
    });

    it("para de ouvir e limpa o intervalo ao desmontar", () => {
        registrarBloqueio("POST /login", 10, "Aguarde.");
        const remover = vi.spyOn(window, "removeEventListener");
        const { unmount } = renderHook(() => useEsperaLimite("POST /login"));
        expect(vi.getTimerCount()).toBe(1);

        unmount();
        expect(vi.getTimerCount()).toBe(0);
        expect(remover).toHaveBeenCalledWith("unieduca:limite-requisicoes", expect.any(Function));
        remover.mockRestore();
    });
});
