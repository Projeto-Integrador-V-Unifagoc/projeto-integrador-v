import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assistenteApi } from "../../services/assistente-api";
import AssistenteWidget from "./AssistenteWidget";
import { consultarDisponibilidade, escutarPerguntas, limparDisponibilidade, perguntarAoAssistente } from "./ponte";

vi.mock("../../services/assistente-api", () => ({
    assistenteApi: { status: vi.fn(), enviar: vi.fn() },
}));

const TD = "11111111-1111-4111-8111-111111111111";

function montar() {
    return render(
        <MemoryRouter>
            <AssistenteWidget />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    limparDisponibilidade();
    sessionStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(assistenteApi.enviar).mockResolvedValue({ resposta: "Resposta do assistente" });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("ponte dashboard → assistente", () => {
    it("entrega a pergunta e a ação para quem escuta e ignora texto vazio", () => {
        const recebido = vi.fn();
        const parar = escutarPerguntas(recebido);
        perguntarAoAssistente("  Entender meu desempenho em Cálculo ", { tipo: "entender_desempenho", turmaDisciplinaId: TD });
        perguntarAoAssistente("   ");
        parar();
        perguntarAoAssistente("depois de parar");
        expect(recebido).toHaveBeenCalledTimes(1);
        expect(recebido).toHaveBeenCalledWith({ pergunta: "Entender meu desempenho em Cálculo", acao: { tipo: "entender_desempenho", turmaDisciplinaId: TD } });
    });
});

describe("status do assistente", () => {
    it("reaproveita a consulta recente e reconsulta depois da validade", async () => {
        vi.useFakeTimers();
        try {
            vi.mocked(assistenteApi.status).mockResolvedValueOnce({ ativo: false }).mockResolvedValueOnce({ ativo: true });
            expect(await consultarDisponibilidade()).toBe(false);
            expect(await consultarDisponibilidade()).toBe(false);
            expect(assistenteApi.status).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(31_000);
            expect(await consultarDisponibilidade()).toBe(true);
            expect(assistenteApi.status).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("AssistenteWidget recebendo pedidos das telas", () => {
    it("abre o chat e envia a pergunta com a ação para o backend", async () => {
        vi.mocked(assistenteApi.status).mockResolvedValue({ ativo: true });
        montar();
        await screen.findByRole("button", { name: "Abrir assistente de suporte" });

        act(() => perguntarAoAssistente("Analisar Caio em POO (ADS2A)", { tipo: "analisar_aluno", turmaDisciplinaId: TD, alunoId: TD }));

        expect(await screen.findByRole("dialog", { name: "Assistente de suporte" })).toBeInTheDocument();
        expect(screen.getByText("Analisar Caio em POO (ADS2A)")).toBeInTheDocument();
        await waitFor(() => expect(assistenteApi.enviar).toHaveBeenCalledWith(
            "Analisar Caio em POO (ADS2A)",
            [],
            { tipo: "analisar_aluno", turmaDisciplinaId: TD, alunoId: TD },
        ));
        expect(await screen.findByText("Resposta do assistente")).toBeInTheDocument();
    });

    it("sugestão comum vai sem ação", async () => {
        vi.mocked(assistenteApi.status).mockResolvedValue({ ativo: true });
        montar();
        await screen.findByRole("button", { name: "Abrir assistente de suporte" });

        act(() => perguntarAoAssistente("Quais alunos precisam de atenção?"));

        await waitFor(() => expect(assistenteApi.enviar).toHaveBeenCalledWith("Quais alunos precisam de atenção?", [], undefined));
    });

    it("com o assistente desativado, nada aparece nem é enviado", async () => {
        vi.mocked(assistenteApi.status).mockResolvedValue({ ativo: false });
        montar();
        await waitFor(() => expect(assistenteApi.status).toHaveBeenCalled());

        act(() => perguntarAoAssistente("Quais devem ser minhas prioridades?", { tipo: "orientacoes" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(assistenteApi.enviar).not.toHaveBeenCalled();
    });
});
