import { describe, expect, it } from "vitest";

import {
    carregarBase,
    lerArtigo,
    perfilDoUsuario,
    promptDoSistema,
    respostaDaAjuda,
    sumario,
} from "./carregador";

const conhecimento = carregarBase();
const codigos = (perfil: "aluno" | "professor" | "secretaria") => [...conhecimento.artigos[perfil].keys()];

describe("base de conhecimento do assistente", () => {
    it("carrega as políticas e artigos para os três perfis", () => {
        expect(conhecimento.politicas.comum).toContain("Política de suporte");
        for (const perfil of ["aluno", "professor", "secretaria"] as const) {
            expect(conhecimento.politicas[perfil].length).toBeGreaterThan(0);
            expect(codigos(perfil)).toEqual(expect.arrayContaining(["login", "recuperar-senha", "perfil", "suporte"]));
        }
    });

    it("o aluno não enxerga artigos do professor nem da secretaria", () => {
        const doAluno = codigos("aluno");
        for (const codigo of ["lancar-notas", "frequencia-chamada", "avaliacoes", "usuarios", "configurar-assistente", "autorizar-retificacao"]) {
            expect(doAluno).not.toContain(codigo);
        }
        const prompt = promptDoSistema(conhecimento, "aluno");
        expect(prompt).not.toMatch(/lancar-notas|usuarios:|configurar-assistente|Lançamento de Notas/);
        expect(prompt).toContain("minhas-notas:");
    });

    it("o professor não enxerga as telas administrativas nem as do aluno", () => {
        const doProfessor = codigos("professor");
        expect(doProfessor).toEqual(expect.arrayContaining(["lancar-notas", "frequencia-chamada", "retificar-notas"]));
        for (const codigo of ["usuarios", "alunos", "turmas", "configurar-assistente", "minhas-notas", "justificar-falta"]) {
            expect(doProfessor).not.toContain(codigo);
        }
    });

    it("a secretaria enxerga a gestão e os artigos compartilhados com o professor", () => {
        expect(codigos("secretaria")).toEqual(
            expect.arrayContaining(["usuarios", "turmas", "lancar-notas", "autorizar-retificacao", "configurar-assistente"]),
        );
        expect(codigos("secretaria")).not.toContain("retificar-notas");
    });

    it("consultar um código de outro perfil responde como inexistente, com o sumário do próprio perfil", () => {
        const resposta = respostaDaAjuda(conhecimento, "aluno", "lancar-notas");
        expect(resposta).toContain('Não existe o tópico "lancar-notas"');
        expect(resposta).toBe(`Não existe o tópico "lancar-notas". Tópicos disponíveis:\n${sumario(conhecimento, "aluno")}`);
    });

    it("devolve o artigo com o link interno da tela", () => {
        const resposta = respostaDaAjuda(conhecimento, "aluno", "  Minhas-Notas ");
        expect(resposta).toContain("Consultar minhas notas");
        expect(resposta).toContain("Link da tela: [Abrir Minhas Notas](/minhas-notas)");
    });

    it("toda rota de artigo é interna", () => {
        for (const perfil of ["aluno", "professor", "secretaria"] as const) {
            for (const artigo of conhecimento.artigos[perfil].values()) expect(artigo.rota.startsWith("/")).toBe(true);
        }
    });
});

describe("lerArtigo", () => {
    const valido = "---\ncodigo: x\ntitulo: X\nperfis: [aluno, professor]\nrota: /x\ntela: X\nresumo: algo\n---\nCorpo";

    it("lê o frontmatter e o corpo", () => {
        expect(lerArtigo(valido, "x.md")).toMatchObject({ codigo: "x", perfis: ["aluno", "professor"], conteudo: "Corpo" });
    });

    it("recusa perfil desconhecido, campo faltando e rota externa", () => {
        expect(() => lerArtigo(valido.replace("[aluno, professor]", "[diretor]"), "x.md")).toThrow(/perfil desconhecido/);
        expect(() => lerArtigo(valido.replace("resumo: algo\n", ""), "x.md")).toThrow(/resumo/);
        expect(() => lerArtigo(valido.replace("rota: /x", "rota: https://evil.example"), "x.md")).toThrow(/interna/);
        expect(() => lerArtigo("sem frontmatter", "x.md")).toThrow(/frontmatter/);
    });
});

describe("perfilDoUsuario", () => {
    it("mapeia o tipo do token e recusa tipos desconhecidos", () => {
        expect(perfilDoUsuario("administrador")).toBe("secretaria");
        expect(perfilDoUsuario(" Secretaria ")).toBe("secretaria");
        expect(perfilDoUsuario("professor")).toBe("professor");
        expect(perfilDoUsuario("aluno")).toBe("aluno");
        expect(perfilDoUsuario("visitante")).toBeNull();
        expect(perfilDoUsuario(undefined)).toBeNull();
    });
});
