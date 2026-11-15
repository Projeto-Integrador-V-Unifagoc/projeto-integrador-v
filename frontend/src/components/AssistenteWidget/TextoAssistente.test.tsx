import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import TextoAssistente from "./TextoAssistente";
import { separarAtalhos } from "./atalhos";
import { ehRotaInterna } from "./rotaInterna";

function renderizar(texto: string, aoNavegar?: () => void) {
    return render(
        <MemoryRouter>
            <TextoAssistente texto={texto} aoNavegar={aoNavegar} />
        </MemoryRouter>,
    );
}

describe("ehRotaInterna", () => {
    it("aceita só rotas internas", () => {
        expect(ehRotaInterna("/minhas-notas")).toBe(true);
        expect(ehRotaInterna("https://exemplo.com")).toBe(false);
        expect(ehRotaInterna("//exemplo.com")).toBe(false);
        expect(ehRotaInterna("javascript:alert(1)")).toBe(false);
    });
});

describe("separarAtalhos", () => {
    it("tira do texto a linha que só tem link e cria um atalho por tela", () => {
        const { corpo, atalhos } = separarAtalhos(
            "Você tem 3 faltas.\n\n[Abrir Minha Frequência](/minha-frequencia)\n[Abrir Minha Frequência](/minha-frequencia)",
        );
        expect(corpo).toBe("Você tem 3 faltas.");
        expect(atalhos).toEqual([{ rotulo: "Abrir Minha Frequência", rota: "/minha-frequencia" }]);
    });

    it("mantém a frase que cita a tela e padroniza o rótulo do botão", () => {
        const { corpo, atalhos } = separarAtalhos("Veja em [Minhas Notas](/minhas-notas) e [Abrir Minha Agenda](/minha-agenda).");
        expect(corpo).toBe("Veja em [Minhas Notas](/minhas-notas) e [Abrir Minha Agenda](/minha-agenda).");
        expect(atalhos.map((a) => a.rotulo)).toEqual(["Abrir Minhas Notas", "Abrir Minha Agenda"]);
    });

    it("remove linhas só de links alternadas sem perder nenhuma (regex sem estado)", () => {
        const { corpo, atalhos } = separarAtalhos("[A](/a)\n[B](/b)\n[C](/c)");
        expect(corpo).toBe("");
        expect(atalhos).toHaveLength(3);
    });

    it("link externo não vira atalho", () => {
        expect(separarAtalhos("[site](https://x.com)").atalhos).toEqual([]);
    });
});

describe("TextoAssistente", () => {
    it("mostra o link da tela como botão no fim, sem repetir o link no texto", () => {
        const aoNavegar = vi.fn();
        renderizar("Sua média em **Computação em Nuvem** é 40.\n\n[Abrir Minhas Notas](/minhas-notas)", aoNavegar);

        expect(screen.getByText("Computação em Nuvem", { selector: "strong" })).toBeTruthy();
        const botao = screen.getByRole("link", { name: "Abrir Minhas Notas" });
        expect(botao.getAttribute("href")).toBe("/minhas-notas");
        expect(screen.getAllByRole("link")).toHaveLength(1);

        fireEvent.click(botao);
        expect(aoNavegar).toHaveBeenCalledOnce();
    });

    it("link no meio da frase vira só o nome da tela, e o botão vai para o fim", () => {
        renderizar("Você pode acompanhar na tela [Abrir Minha Frequência](/minha-frequencia).");
        expect(screen.getByText("Minha Frequência", { selector: "strong" })).toBeTruthy();
        expect(screen.queryByText(/tela Abrir/)).toBeNull();
        expect(screen.getByRole("link", { name: "Abrir Minha Frequência" })).toBeTruthy();
    });

    it("renderiza listas numeradas", () => {
        renderizar("Siga:\n1. Abra o menu.\n2. Escolha o período.");
        expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });

    it("mostra link externo só como texto e não interpreta HTML", () => {
        const { container } = renderizar('[Clique](https://malicioso.example) <img src=x onerror="alert(1)">');
        expect(screen.queryByRole("link")).toBeNull();
        expect(screen.getByText(/Clique/)).toBeTruthy();
        expect(container.querySelector("img")).toBeNull();
    });
});
