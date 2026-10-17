import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    BaldeDeFichas,
    CODIGO_BLOQUEIO_LOCAL,
    EVENTO_LIMITE_REQUISICOES,
    chaveDaRequisicao,
    configurarLimiteDeRequisicoes,
    formatarEspera,
    lerRetryAfter,
    limparBloqueios,
    segundosAteLiberar,
    type DetalheLimite,
} from "./limite-requisicoes";

afterEach(() => {
    limparBloqueios();
    vi.useRealTimers();
});

function resposta429(config: InternalAxiosRequestConfig, retryAfter: string, limite = "login") {
    return Promise.reject(
        new AxiosError("429", "ERR_BAD_REQUEST", config, undefined, {
            status: 429,
            statusText: "Too Many Requests",
            headers: { "retry-after": retryAfter },
            config,
            data: { error: "Muitas tentativas de login.", limite },
        }),
    );
}

function instancia(adapter: AxiosAdapter) {
    const api = axios.create({ baseURL: "/api", adapter });
    configurarLimiteDeRequisicoes(api, new BaldeDeFichas(100, 100));
    return api;
}

describe("utilitários", () => {
    it("identifica a requisição por método e caminho, sem query string", () => {
        expect(chaveDaRequisicao({ method: "post", url: "/login" })).toBe("POST /login");
        expect(chaveDaRequisicao({ method: "get", url: "alunos?pagina=2" })).toBe("GET /alunos");
        expect(chaveDaRequisicao({ url: "https://api.exemplo.com/cidades" })).toBe("GET /cidades");
    });

    it("lê Retry-After em segundos ou como data HTTP", () => {
        const agora = Date.parse("2026-10-16T12:00:00Z");
        expect(lerRetryAfter("120", agora)).toBe(120);
        expect(lerRetryAfter("Fri, 16 Oct 2026 12:01:00 GMT", agora)).toBe(60);
        expect(lerRetryAfter(undefined, agora)).toBe(30);
        expect(lerRetryAfter("lixo", agora)).toBe(30);
    });

    it("formata a espera para o usuário", () => {
        expect(formatarEspera(1)).toBe("1 segundo");
        expect(formatarEspera(45)).toBe("45 segundos");
        expect(formatarEspera(60)).toBe("1 minuto");
        expect(formatarEspera(61)).toBe("2 minutos");
    });
});

describe("configurarLimiteDeRequisicoes", () => {
    it("após um 429 recusa localmente a mesma rota até o Retry-After expirar", async () => {
        vi.useFakeTimers();
        const adapter = vi.fn<AxiosAdapter>((config) => resposta429(config, "90"));
        const api = instancia(adapter);

        await expect(api.post("/login", {})).rejects.toMatchObject({ response: { status: 429 } });
        expect(segundosAteLiberar("POST /login")).toBe(90);

        const local = await api.post("/login", {}).catch((erro: AxiosError) => erro);
        expect(local).toBeInstanceOf(AxiosError);
        expect((local as AxiosError).code).toBe(CODIGO_BLOQUEIO_LOCAL);
        expect((local as AxiosError<{ error: string }>).response?.data.error).toContain("2 minutos");
        expect(adapter).toHaveBeenCalledTimes(1);

        // Outras rotas seguem liberadas quando o limite não é o global.
        adapter.mockImplementation(async (config) => ({ data: [], status: 200, statusText: "OK", headers: {}, config }));
        await expect(api.get("/cursos")).resolves.toMatchObject({ status: 200 });

        vi.advanceTimersByTime(90_000);
        await expect(api.post("/login", {})).resolves.toMatchObject({ status: 200 });
    });

    it("limite global bloqueia todas as rotas e emite o evento para a interface", async () => {
        const eventos: DetalheLimite[] = [];
        const ouvir = (e: Event) => eventos.push((e as CustomEvent<DetalheLimite>).detail);
        window.addEventListener(EVENTO_LIMITE_REQUISICOES, ouvir);

        try {
            const adapter = vi.fn<AxiosAdapter>((config) => resposta429(config, "10", "global"));
            const api = instancia(adapter);

            await expect(api.get("/alunos")).rejects.toBeInstanceOf(AxiosError);
            await expect(api.get("/cursos")).rejects.toMatchObject({ code: CODIGO_BLOQUEIO_LOCAL });
            expect(adapter).toHaveBeenCalledTimes(1);
            expect(eventos).toEqual([
                { chave: "*", segundos: 10, mensagem: "Muitas tentativas de login.", global: true },
            ]);
        } finally {
            window.removeEventListener(EVENTO_LIMITE_REQUISICOES, ouvir);
        }
    });
});

describe("configurarLimiteDeRequisicoes: o que conta e o que não conta", () => {
    function ok(config: InternalAxiosRequestConfig) {
        return Promise.resolve({ data: {}, status: 200, statusText: "OK", headers: {}, config });
    }

    it("só as escritas passam pelo balde de fichas", async () => {
        const balde = new BaldeDeFichas(100, 100);
        const aguardar = vi.spyOn(balde, "aguardar");
        const api = axios.create({ baseURL: "/api", adapter: ok });
        configurarLimiteDeRequisicoes(api, balde);

        await api.get("/alunos");
        expect(aguardar).not.toHaveBeenCalled();

        await api.post("/alunos", {});
        await api.put("/alunos/1", {});
        await api.patch("/alunos/1", {});
        await api.delete("/alunos/1");
        expect(aguardar).toHaveBeenCalledTimes(4);
    });

    it("erros que não são 429 não criam bloqueio", async () => {
        const adapter = vi.fn<AxiosAdapter>((config) =>
            Promise.reject(
                new AxiosError("500", "ERR_BAD_RESPONSE", config, undefined, {
                    status: 500, statusText: "Erro", headers: {}, config, data: { error: "falhou" },
                }),
            ),
        );
        const api = instancia(adapter);

        await expect(api.post("/login", {})).rejects.toMatchObject({ response: { status: 500 } });
        adapter.mockImplementationOnce(() => Promise.reject(new AxiosError("Network Error", "ERR_NETWORK")));
        await expect(api.post("/login", {})).rejects.toMatchObject({ code: "ERR_NETWORK" });

        expect(segundosAteLiberar("POST /login")).toBe(0);
        expect(adapter).toHaveBeenCalledTimes(2);
    });

    it("429 sem Retry-After bloqueia pela espera padrão e usa a mensagem genérica", async () => {
        const eventos: DetalheLimite[] = [];
        const ouvir = (e: Event) => eventos.push((e as CustomEvent<DetalheLimite>).detail);
        window.addEventListener(EVENTO_LIMITE_REQUISICOES, ouvir);

        try {
            const api = instancia((config) =>
                Promise.reject(
                    new AxiosError("429", "ERR_BAD_REQUEST", config, undefined, {
                        status: 429, statusText: "Too Many Requests", headers: {}, config, data: "",
                    }),
                ),
            );

            await expect(api.post("/recuperacao-senha", {})).rejects.toBeInstanceOf(AxiosError);
            expect(segundosAteLiberar("POST /recuperacao-senha")).toBe(30);
            expect(eventos).toEqual([
                {
                    chave: "POST /recuperacao-senha",
                    segundos: 30,
                    mensagem: "Muitas solicitações. Tente novamente em 30 segundos.",
                    global: false,
                },
            ]);
        } finally {
            window.removeEventListener(EVENTO_LIMITE_REQUISICOES, ouvir);
        }
    });
});

describe("BaldeDeFichas", () => {
    it("deixa passar a rajada até a capacidade e depois espera a reposição", async () => {
        let agora = 0;
        const esperas: number[] = [];
        const balde = new BaldeDeFichas(2, 2, () => agora, async (ms) => { esperas.push(ms); });

        await balde.aguardar();
        await balde.aguardar();
        expect(esperas).toEqual([]);

        await balde.aguardar();
        await balde.aguardar();
        expect(esperas).toEqual([500, 1000]);

        agora = 10_000;
        await balde.aguardar();
        expect(esperas).toHaveLength(2);
    });
});
