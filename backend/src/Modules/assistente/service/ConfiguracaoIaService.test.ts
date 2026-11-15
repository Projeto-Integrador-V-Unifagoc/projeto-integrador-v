import { beforeEach, describe, expect, it } from "vitest";
import { AIMessage } from "@langchain/core/messages";

import { decifrar } from "../../configuracao-email/service/CriptografiaSegredo";
import type { ConfiguracaoIa, ConfiguracaoIaRepository } from "../repository/ConfiguracaoIaRepository";
import { ConfiguracaoIaService } from "./ConfiguracaoIaService";
import type { FabricaDeModelo, ParametrosModelo } from "./ModeloIa";

function repositorioEmMemoria() {
    let linha: ConfiguracaoIa = {
        id: 1,
        provedor: "anthropic",
        modelo: "",
        api_key_cifrada: "",
        api_key_final: "",
        ativo: false,
        testado_em: null,
        resultado_teste: "",
    };
    const repo = {
        buscar: async () => ({ ...linha }),
        atualizar: async (dados: Partial<ConfiguracaoIa>) => (linha = { ...linha, ...dados }),
        registrarTeste: async (sucesso: boolean, mensagem: string) => {
            linha = { ...linha, testado_em: "agora", resultado_teste: `${sucesso ? "ok" : "erro"}: ${mensagem}` };
        },
    };
    return { repo: repo as unknown as ConfiguracaoIaRepository, atual: () => linha };
}

describe("ConfiguracaoIaService", () => {
    let memoria: ReturnType<typeof repositorioEmMemoria>;
    let recebido: ParametrosModelo | null;
    let falhar: Error | null;
    const fabrica: FabricaDeModelo = ((p: ParametrosModelo) => {
        recebido = p;
        return {
            invoke: async () => {
                if (falhar) throw falhar;
                return new AIMessage("ok");
            },
        };
    }) as unknown as FabricaDeModelo;

    let servico: ConfiguracaoIaService;

    beforeEach(() => {
        memoria = repositorioEmMemoria();
        recebido = null;
        falhar = null;
        servico = new ConfiguracaoIaService(memoria.repo, fabrica);
    });

    it("cifra a chave e nunca a devolve, só os últimos caracteres", async () => {
        const publica = await servico.atualizar({ provedor: "openai", modelo: "gpt-5", apiKey: "sk-segredo-1234", ativo: true });

        expect(publica).toMatchObject({ provedor: "openai", possuiChave: true, chaveFinal: "1234", ativo: true });
        expect(JSON.stringify(publica)).not.toContain("sk-segredo");
        expect(memoria.atual().api_key_cifrada).not.toContain("sk-segredo");
        expect(decifrar(memoria.atual().api_key_cifrada, "assistente-ia")).toBe("sk-segredo-1234");
        expect(() => decifrar(memoria.atual().api_key_cifrada)).toThrow();
    });

    it("não ativa sem chave e não troca de provedor sem chave nova", async () => {
        await expect(servico.atualizar({ ativo: true })).rejects.toMatchObject({ status: 400 });

        await servico.atualizar({ provedor: "anthropic", apiKey: "sk-ant-abc" });
        await expect(servico.atualizar({ provedor: "google" })).rejects.toMatchObject({ status: 400 });
    });

    it("recusa provedor, modelo e chave inválidos", async () => {
        await expect(servico.atualizar({ provedor: "outro" })).rejects.toMatchObject({ status: 400 });
        await expect(servico.atualizar({ modelo: "a b; drop" })).rejects.toMatchObject({ status: 400 });
        await expect(servico.atualizar({ apiKey: "com espaço" })).rejects.toMatchObject({ status: 400 });
    });

    it("só aceita modelos da lista do provedor escolhido", async () => {
        const publica = await servico.buscarPublico();
        expect(publica.modelosDisponiveis.google.map((m) => m.valor)).toContain("gemini-flash-lite-latest");

        await expect(servico.atualizar({ modelo: "gemini-flash-lite-lates" })).rejects.toMatchObject({ status: 400 });
        await expect(servico.atualizar({ modelo: "gemini-flash-latest" })).rejects.toMatchObject({ status: 400 });
        expect((await servico.atualizar({ provedor: "google", modelo: "gemini-flash-latest", apiKey: "AQ.x" })).modelo).toBe(
            "gemini-flash-latest",
        );

        // Trocar de provedor sem escolher modelo volta para o padrão do novo provedor.
        expect((await servico.atualizar({ provedor: "anthropic", apiKey: "sk-ant-y" })).modelo).toBe("");
    });

    it("modelo salvo fora da lista cai no padrão na hora de usar", async () => {
        await servico.atualizar({ provedor: "google", apiKey: "AQ.x", ativo: true });
        await memoria.repo.atualizar({ modelo: "gemini-flash-lite-lates" });
        expect((await servico.parametrosDeUso()).modelo).toBe("");
    });

    it("[3] trocar chave, provedor ou modelo apaga o resultado do teste anterior", async () => {
        await servico.atualizar({ provedor: "google", apiKey: "AQ.chave-a" });
        await servico.testarConexao();
        expect((await servico.buscarPublico()).resultadoTeste).toMatch(/^ok:/);

        // Ligar/desligar não mexe na conexão: o teste continua valendo.
        await servico.atualizar({ ativo: true });
        expect((await servico.buscarPublico()).testadoEm).not.toBeNull();

        for (const mudanca of [{ apiKey: "AQ.chave-b" }, { modelo: "gemini-flash-latest" }, { provedor: "anthropic", apiKey: "sk-ant-c" }]) {
            await servico.testarConexao();
            const publica = await servico.atualizar(mudanca);
            expect(publica.testadoEm).toBeNull();
            expect(publica.resultadoTeste).toBe("");
        }
    });

    it("entrega a chave decifrada só para uso interno, e só com o assistente ativo", async () => {
        await servico.atualizar({ apiKey: "sk-ant-abc" });
        await expect(servico.parametrosDeUso()).rejects.toMatchObject({ status: 503 });
        expect(await servico.estaAtivo()).toBe(false);

        await servico.atualizar({ ativo: true });
        expect(await servico.parametrosDeUso()).toEqual({ provedor: "anthropic", modelo: "", apiKey: "sk-ant-abc" });
        expect(await servico.estaAtivo()).toBe(true);
    });

    it("testa a conexão e registra o resultado", async () => {
        await servico.atualizar({ apiKey: "sk-ant-abc" });

        expect(await servico.testarConexao()).toEqual({ sucesso: true, mensagem: "Conexão com o provedor funcionando." });
        expect(recebido?.apiKey).toBe("sk-ant-abc");

        falhar = Object.assign(new Error("authentication_error"), { status: 401 });
        const falha = await servico.testarConexao();
        expect(falha.sucesso).toBe(false);
        expect(falha.mensagem).toMatch(/chave de acesso/);
        expect(memoria.atual().resultado_teste).toMatch(/^erro:/);
    });
});
