import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

/**
 * Rate limiting do lado do cliente.
 *
 * O limite que vale é o do backend (o cliente pode ser burlado); aqui o
 * frontend só evita gastar requisições que já sabe que serão recusadas:
 *
 * 1. Respeita o 429: guarda o `Retry-After` e, até ele expirar, recusa
 *    localmente novas chamadas para a mesma rota (ou para todas, quando o
 *    bloqueio foi o limite global) sem ir à rede.
 * 2. Suaviza rajadas de escrita com um token bucket: POST/PUT/PATCH/DELETE
 *    consomem uma ficha; sem ficha, a requisição espera a reposição em vez de
 *    ser descartada (clique duplo, laços de envio).
 */

export const EVENTO_LIMITE_REQUISICOES = "unieduca:limite-requisicoes";
export const CODIGO_BLOQUEIO_LOCAL = "ERR_LIMITE_REQUISICOES";

export interface DetalheLimite {
    chave: string;
    segundos: number;
    mensagem: string;
    global: boolean;
}

const CHAVE_GLOBAL = "*";
const ESPERA_PADRAO_SEGUNDOS = 30;
const METODOS_DE_ESCRITA = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Chave da rota → instante (ms) em que volta a ser permitido chamar. */
const bloqueios = new Map<string, number>();

export function chaveDaRequisicao(config: Pick<InternalAxiosRequestConfig, "method" | "url">): string {
    const metodo = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";
    const caminho = /^https?:\/\//i.test(url) ? new URL(url).pathname : url.split(/[?#]/)[0];
    return `${metodo} /${caminho.replace(/^\/+/, "")}`;
}

/** `Retry-After` vem em segundos ou como data HTTP. */
export function lerRetryAfter(valor: unknown, agora = Date.now()): number {
    if (valor === undefined || valor === null || valor === "") return ESPERA_PADRAO_SEGUNDOS;

    const texto = String(valor).trim();
    if (/^\d+$/.test(texto)) return Math.max(1, Number(texto));

    const data = Date.parse(texto);
    if (!Number.isNaN(data)) return Math.max(1, Math.ceil((data - agora) / 1000));

    return ESPERA_PADRAO_SEGUNDOS;
}

export function formatarEspera(segundos: number): string {
    if (segundos < 60) return segundos === 1 ? "1 segundo" : `${segundos} segundos`;
    const minutos = Math.ceil(segundos / 60);
    return minutos === 1 ? "1 minuto" : `${minutos} minutos`;
}

export function segundosAteLiberar(chave: string, agora = Date.now()): number {
    const liberacao = Math.max(bloqueios.get(chave) ?? 0, bloqueios.get(CHAVE_GLOBAL) ?? 0);
    return Math.max(0, Math.ceil((liberacao - agora) / 1000));
}

export function registrarBloqueio(chave: string, segundos: number, mensagem: string, global = false, agora = Date.now()) {
    const alvo = global ? CHAVE_GLOBAL : chave;
    const liberacao = agora + segundos * 1000;
    bloqueios.set(alvo, Math.max(bloqueios.get(alvo) ?? 0, liberacao));

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent<DetalheLimite>(EVENTO_LIMITE_REQUISICOES, {
                detail: { chave: alvo, segundos, mensagem, global },
            }),
        );
    }
}

export function limparBloqueios() {
    bloqueios.clear();
}

export class BaldeDeFichas {
    private fichas: number;
    private ultimaReposicao: number;

    constructor(
        private readonly capacidade: number,
        private readonly fichasPorSegundo: number,
        private readonly agora: () => number = Date.now,
        private readonly dormir: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
    ) {
        this.fichas = capacidade;
        this.ultimaReposicao = agora();
    }

    /** Reserva uma ficha e resolve quando ela estiver disponível. */
    async aguardar(): Promise<void> {
        const instante = this.agora();
        const decorrido = (instante - this.ultimaReposicao) / 1000;
        this.fichas = Math.min(this.capacidade, this.fichas + decorrido * this.fichasPorSegundo);
        this.ultimaReposicao = instante;

        // Reserva mesmo sem saldo: chamadas concorrentes entram numa fila implícita.
        this.fichas -= 1;
        if (this.fichas >= 0) return;

        await this.dormir((-this.fichas / this.fichasPorSegundo) * 1000);
    }
}

const baldeDeEscritas = new BaldeDeFichas(10, 2);

function mensagemDoServidor(dados: unknown): string | undefined {
    if (dados && typeof dados === "object" && "error" in dados && typeof dados.error === "string") {
        return dados.error;
    }
    return undefined;
}

function limiteDoServidor(dados: unknown): string | undefined {
    if (dados && typeof dados === "object" && "limite" in dados && typeof dados.limite === "string") {
        return dados.limite;
    }
    return undefined;
}

function erroDeBloqueioLocal(config: InternalAxiosRequestConfig, segundos: number) {
    const mensagem = `Muitas solicitações em pouco tempo. Tente novamente em ${formatarEspera(segundos)}.`;

    // Mesmo formato de um 429 do backend, para o tratamento de erro das telas
    // (`error.response.data.error`) funcionar sem mudança.
    return new AxiosError(mensagem, CODIGO_BLOQUEIO_LOCAL, config, undefined, {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "retry-after": String(segundos) },
        config,
        data: { error: mensagem, limite: "cliente", tentarNovamenteEm: segundos },
    });
}

export function configurarLimiteDeRequisicoes(instance: AxiosInstance, balde: BaldeDeFichas = baldeDeEscritas) {
    instance.interceptors.request.use(async (config) => {
        const segundos = segundosAteLiberar(chaveDaRequisicao(config));
        if (segundos > 0) throw erroDeBloqueioLocal(config, segundos);

        if (METODOS_DE_ESCRITA.has((config.method ?? "get").toUpperCase())) {
            await balde.aguardar();
        }

        return config;
    });

    instance.interceptors.response.use(undefined, (error: unknown) => {
        if (
            error instanceof AxiosError &&
            error.code !== CODIGO_BLOQUEIO_LOCAL &&
            error.response?.status === 429 &&
            error.config
        ) {
            const { data, headers } = error.response;
            const segundos = lerRetryAfter(headers?.["retry-after"]);
            const mensagem =
                mensagemDoServidor(data) ?? `Muitas solicitações. Tente novamente em ${formatarEspera(segundos)}.`;

            registrarBloqueio(chaveDaRequisicao(error.config), segundos, mensagem, limiteDoServidor(data) === "global");
        }

        return Promise.reject(error);
    });
}
