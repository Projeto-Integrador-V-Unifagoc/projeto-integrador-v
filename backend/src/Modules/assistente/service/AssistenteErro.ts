export class AssistenteErro extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = "AssistenteErro";
    }
}

export class TempoEsgotadoErro extends Error {
    constructor() {
        super("timeout");
        this.name = "TimeoutError";
    }
}

/**
 * Limita o tempo de uma chamada ao provedor. Não dá para confiar só no `signal`: o SDK do Google, por exemplo,
 * ignora o cancelamento enquanto refaz as tentativas com o modelo sobrecarregado.
 */
export function comTempoLimite<T>(promessa: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
    const controle = new AbortController();
    let relogio: NodeJS.Timeout | undefined;
    const limite = new Promise<never>((_, rejeitar) => {
        relogio = setTimeout(() => {
            controle.abort();
            rejeitar(new TempoEsgotadoErro());
        }, ms);
    });
    return Promise.race([promessa(controle.signal), limite]).finally(() => clearTimeout(relogio));
}

/**
 * Cadeia de causas do erro (código e mensagem), só para o log do servidor. Um "fetch failed" do SDK esconde
 * o motivo real (DNS, conexão recusada, certificado, proxy) em `cause`; sem isso o diagnóstico fica às cegas.
 */
export function causasDoErro(err: unknown): string {
    const causas: string[] = [];
    let atual = (err as { cause?: unknown })?.cause;
    for (let i = 0; atual && i < 5; i++) {
        const c = atual as { code?: string; message?: string; cause?: unknown };
        causas.push([c.code, c.message].filter(Boolean).join(" "));
        atual = c.cause;
    }
    return causas.length ? `| causa: ${causas.join(" <- ")}` : "";
}

/** Traduz o erro do provedor para uma mensagem que a pessoa entende, sem vazar detalhes técnicos. */
export function erroDoProvedor(err: any): AssistenteErro {
    const status = err?.lc_error_code === "MODEL_AUTHENTICATION"
        ? 401
        : Number(err?.status ?? err?.response?.status ?? 0);
    const texto = String(err?.message ?? "").toLowerCase();

    if (status === 401 || status === 403 || /api key|apikey|unauthori|authentication|permission/.test(texto)) {
        return new AssistenteErro(502, "A chave de acesso do provedor de IA foi recusada. Confira a configuração do assistente.");
    }
    if (status === 404 || /model.*not found|not_found|does not exist|unknown model/.test(texto)) {
        return new AssistenteErro(502, "O modelo configurado não foi encontrado no provedor. Confira o nome do modelo.");
    }
    if (status === 429 || /rate limit|quota|exceeded/.test(texto)) {
        return new AssistenteErro(503, "O provedor de IA está sem limite disponível no momento. Tente novamente em instantes.");
    }
    if (status === 503 || status === 529 || /overloaded|high demand|unavailable|\[503/.test(texto)) {
        return new AssistenteErro(503, "O modelo de IA está sobrecarregado agora. Tente novamente em instantes.");
    }
    // Sem conexão com o provedor (rede, DNS, proxy ou certificado TLS — ex.: antivírus inspecionando HTTPS).
    if (/fetch failed|econnrefused|enotfound|econnreset|certificate|self[- ]signed|unable to verify/.test(texto)) {
        return new AssistenteErro(502, "O servidor não conseguiu se conectar ao provedor de IA. Verifique a conexão de rede do servidor.");
    }
    if (err?.name === "AbortError" || err?.name === "TimeoutError" || /abort|timed? ?out/.test(texto)) {
        return new AssistenteErro(504, "O provedor de IA demorou demais para responder. Tente novamente em instantes.");
    }
    return new AssistenteErro(502, "O assistente não conseguiu responder agora. Tente novamente em instantes.");
}
