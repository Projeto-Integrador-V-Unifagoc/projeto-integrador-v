import { describe, expect, it } from "vitest";
import { causasDoErro, erroDoProvedor } from "./AssistenteErro";

const URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

describe("erroDoProvedor", () => {
    it("falha de conexão (ex.: certificado interceptado por antivírus) tem mensagem própria", () => {
        const err = new Error(`[GoogleGenerativeAI Error]: Error fetching from ${URL_GEMINI}: fetch failed`);
        expect(erroDoProvedor(err).message).toMatch(/não conseguiu se conectar ao provedor de IA/);
        expect(erroDoProvedor(new Error("unable to verify the first certificate")).message).toMatch(/conectar/);
        expect(erroDoProvedor(new Error("getaddrinfo ENOTFOUND api.openai.com")).message).toMatch(/conectar/);
    });

    it("chave recusada continua sendo identificada antes da falha de conexão", () => {
        const err = new Error(`[GoogleGenerativeAI Error]: Error fetching from ${URL_GEMINI}: [400 ] API key not valid.`);
        expect(erroDoProvedor(err).message).toMatch(/chave de acesso do provedor de IA foi recusada/);
    });

    it("erro desconhecido mantém a mensagem genérica", () => {
        expect(erroDoProvedor(new Error("algo estranho")).message).toBe("O assistente não conseguiu responder agora. Tente novamente em instantes.");
    });
});

describe("causasDoErro", () => {
    it("monta a cadeia de causas para o log", () => {
        const raiz = Object.assign(new Error("unable to verify the first certificate"), { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" });
        const err = Object.assign(new Error("fetch failed"), { cause: raiz });
        expect(causasDoErro(err)).toBe("| causa: UNABLE_TO_VERIFY_LEAF_SIGNATURE unable to verify the first certificate");
        expect(causasDoErro(new Error("sem causa"))).toBe("");
    });
});
