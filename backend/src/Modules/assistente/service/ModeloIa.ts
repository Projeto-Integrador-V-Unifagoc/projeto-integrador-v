import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

import type { ProvedorIa } from "../repository/ConfiguracaoIaRepository";

export interface OpcaoDeModelo {
    valor: string;
    rotulo: string;
}

/**
 * Os modelos que a tela oferece para cada provedor; o primeiro é o padrão. Só estes são aceitos,
 * para um nome digitado errado não derrubar o assistente. Para liberar outro modelo, inclua aqui.
 */
export const MODELOS_POR_PROVEDOR: Record<ProvedorIa, OpcaoDeModelo[]> = {
    anthropic: [
        { valor: "claude-haiku-5-5", rotulo: "Claude Haiku 5.5 (rápido e econômico)" },
        { valor: "claude-sonnet-5-5", rotulo: "Claude Sonnet 5.5" },
        { valor: "claude-opus-5-5", rotulo: "Claude Opus 5.5 (mais capaz)" },
    ],
    openai: [
        { valor: "gpt-5-mini", rotulo: "GPT-5 mini (rápido e econômico)" },
        { valor: "gpt-5", rotulo: "GPT-5" },
    ],
    // Aliases mantidos pelo Google: versões fixas são aposentadas. O lite aguenta melhor os picos de demanda.
    google: [
        { valor: "gemini-flash-lite-latest", rotulo: "Gemini Flash-Lite (rápido e econômico)" },
        { valor: "gemini-flash-latest", rotulo: "Gemini Flash" },
        { valor: "gemini-pro-latest", rotulo: "Gemini Pro (exige plano pago)" },
    ],
};

export const MODELO_SUGERIDO = Object.fromEntries(
    Object.entries(MODELOS_POR_PROVEDOR).map(([provedor, modelos]) => [provedor, modelos[0].valor]),
) as Record<ProvedorIa, string>;

export function modeloPermitido(provedor: ProvedorIa, modelo: string): boolean {
    return modelo === "" || MODELOS_POR_PROVEDOR[provedor].some((m) => m.valor === modelo);
}

/**
 * Teto de tokens de saída por chamada. Precisa de folga: em modelos de raciocínio (gpt-5, Gemini "thinking")
 * os tokens de raciocínio ocultos contam nesse limite. Com 1024, uma rodada com várias ferramentas podia
 * gastar tudo raciocinando e devolver texto vazio. A resposta continua curta pela política do prompt.
 */
const MAX_TOKENS_RESPOSTA = 4096;

export interface ParametrosModelo {
    provedor: ProvedorIa;
    modelo: string;
    apiKey: string;
}

export type FabricaDeModelo = (parametros: ParametrosModelo) => Promise<BaseChatModel>;

/** Cada SDK só é carregado quando usado: os três juntos deixam a subida do servidor bem mais lenta. */
export const criarModelo: FabricaDeModelo = async ({ provedor, modelo, apiKey }) => {
    const model = modelo || MODELO_SUGERIDO[provedor];
    switch (provedor) {
        case "anthropic": {
            const { ChatAnthropic } = await import("@langchain/anthropic");
            return new ChatAnthropic({ apiKey, model, maxTokens: MAX_TOKENS_RESPOSTA, maxRetries: 1 });
        }
        case "openai": {
            const { ChatOpenAI } = await import("@langchain/openai");
            // Raciocínio "low": suporte e consulta não pedem raciocínio longo. Ignorado por modelos sem raciocínio.
            return new ChatOpenAI({ apiKey, model, maxTokens: MAX_TOKENS_RESPOSTA, maxRetries: 1, reasoning: { effort: "low" } });
        }
        case "google": {
            const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
            return new ChatGoogleGenerativeAI({ apiKey, model, maxOutputTokens: MAX_TOKENS_RESPOSTA, maxRetries: 1 });
        }
    }
};
