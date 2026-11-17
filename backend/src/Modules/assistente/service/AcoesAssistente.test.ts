import { describe, expect, it } from "vitest";
import { AIMessage } from "@langchain/core/messages";

import { carregarBase } from "../conhecimento/carregador";
import { instrucaoDaAcao, validarAcao } from "./AcoesAssistente";
import { AssistenteService } from "./AssistenteService";
import type { ConfiguracaoIaService } from "./ConfiguracaoIaService";
import type { FontesDeDados } from "./FerramentasDados";
import type { FabricaDeModelo } from "./ModeloIa";

const TD = "11111111-1111-4111-8111-111111111111";
const ALUNO = "22222222-2222-4222-8222-222222222222";

describe("validarAcao", () => {
    it("sem ação é uma mensagem comum", () => {
        expect(validarAcao("aluno", undefined)).toBeNull();
        expect(validarAcao("professor", null)).toBeNull();
    });

    it("aceita as ações de cada perfil e devolve só os campos esperados", () => {
        expect(validarAcao("aluno", { tipo: "entender_desempenho", turmaDisciplinaId: TD, extra: "x" })).toEqual({ tipo: "entender_desempenho", turmaDisciplinaId: TD });
        expect(validarAcao("aluno", { tipo: "orientacoes", turmaDisciplinaId: TD })).toEqual({ tipo: "orientacoes" });
        expect(validarAcao("professor", { tipo: "analisar_aluno", turmaDisciplinaId: TD, alunoId: ALUNO })).toEqual({ tipo: "analisar_aluno", turmaDisciplinaId: TD, alunoId: ALUNO });
    });

    it("recusa ação de outro perfil", () => {
        expect(() => validarAcao("aluno", { tipo: "analisar_aluno", turmaDisciplinaId: TD, alunoId: ALUNO })).toThrow(/não está disponível/);
        expect(() => validarAcao("professor", { tipo: "orientacoes" })).toThrow(/não está disponível/);
        expect(() => validarAcao("secretaria", { tipo: "orientacoes" })).toThrow(/não está disponível/);
    });

    it("recusa identificadores fora do formato", () => {
        expect(() => validarAcao("aluno", { tipo: "entender_desempenho", turmaDisciplinaId: "1; drop" })).toThrow(/inválido/);
        expect(() => validarAcao("professor", { tipo: "analisar_aluno", turmaDisciplinaId: TD })).toThrow(/alunoId inválido/);
        expect(() => validarAcao("aluno", "orientacoes")).toThrow(/inválida/);
    });

    it("a instrução interna cita a ação e os identificadores para as ferramentas", () => {
        const texto = instrucaoDaAcao({ tipo: "analisar_aluno", turmaDisciplinaId: TD, alunoId: ALUNO });
        expect(texto).toContain("INSTRUÇÃO INTERNA");
        expect(texto).toContain("consultarAlunoNaTurma");
        expect(texto).toContain(TD);
        expect(texto).toContain(ALUNO);
    });
});

describe("AssistenteService com ação", () => {
    function servicoCapturando() {
        const chamadas: unknown[][] = [];
        const fabrica = (() => ({
            bindTools: () => ({
                invoke: async (mensagens: unknown[]) => {
                    chamadas.push([...mensagens]);
                    return new AIMessage("ok");
                },
            }),
        })) as unknown as FabricaDeModelo;
        const configuracao = { parametrosDeUso: async () => ({ provedor: "anthropic", modelo: "m", apiKey: "k" }) } as unknown as ConfiguracaoIaService;
        const fontes = () => new Proxy({} as FontesDeDados, { get: () => async () => ({}) });
        return { servico: new AssistenteService(configuracao, fabrica, () => carregarBase(), fontes), chamadas };
    }

    it("acrescenta a instrução interna à única mensagem de sistema e mantém o texto visível como pergunta", async () => {
        const { servico, chamadas } = servicoCapturando();
        await servico.responder({ id: "u1", tipo_usuario: "aluno" }, "Entender meu desempenho em Cálculo", [], { tipo: "entender_desempenho", turmaDisciplinaId: TD });

        const mensagens = chamadas[0] as { content: unknown; getType: () => string }[];
        expect(mensagens.filter((m) => m.getType() === "system")).toHaveLength(1);
        expect(String(mensagens[0].content)).toContain("INSTRUÇÃO INTERNA");
        expect(String(mensagens[0].content)).toContain(TD);
        expect(String(mensagens.at(-1)!.content)).toBe("Entender meu desempenho em Cálculo");
    });

    it("sem ação, o prompt de sistema não muda", async () => {
        const { servico, chamadas } = servicoCapturando();
        await servico.responder({ id: "u1", tipo_usuario: "aluno" }, "oi", []);
        expect(String((chamadas[0] as { content: unknown }[])[0].content)).not.toContain("INSTRUÇÃO INTERNA");
    });

    it("recusa a ação de outro perfil antes de chamar o modelo", async () => {
        const { servico, chamadas } = servicoCapturando();
        await expect(servico.responder({ id: "u1", tipo_usuario: "aluno" }, "Analisar", [], { tipo: "analisar_aluno", turmaDisciplinaId: TD, alunoId: ALUNO })).rejects.toMatchObject({ status: 403 });
        expect(chamadas).toHaveLength(0);
    });
});
