import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { bearer } from "../../test-helpers/httpAuth";

// Sem banco: a configuração fica em memória, com uma chave já cifrada salva.
vi.mock("../assistente/repository/ConfiguracaoIaRepository", async (original) => {
    const real = await original<typeof import("../assistente/repository/ConfiguracaoIaRepository")>();
    const { cifrar } = await import("../configuracao-email/service/CriptografiaSegredo");
    const linha = {
        id: 1,
        provedor: "anthropic",
        modelo: "",
        api_key_cifrada: cifrar("sk-ant-segredo-9876", "assistente-ia"),
        api_key_final: "9876",
        ativo: false,
        testado_em: null,
        resultado_teste: "",
    };
    return {
        ...real,
        ConfiguracaoIaRepository: class {
            async buscar() {
                return { ...linha };
            }
            async atualizar(dados: object) {
                return Object.assign(linha, dados);
            }
            async registrarTeste() {}
        },
    };
});

let app: express.Express;

beforeAll(async () => {
    process.env.JWT_SECRET = "x".repeat(40);
    const { assistenteRouter } = await import("./assistenteRoutes");
    app = express().use(express.json()).use(assistenteRouter);
});

describe("rotas do assistente", () => {
    it("exigem login", async () => {
        expect((await request(app).get("/assistente/status")).status).toBe(401);
        expect((await request(app).post("/assistente/mensagens").send({ mensagem: "oi" })).status).toBe(401);
        expect((await request(app).get("/assistente/configuracao")).status).toBe(401);
    });

    it("a configuração é só da secretaria e do administrador", async () => {
        for (const perfil of ["aluno", "professor"]) {
            expect((await request(app).get("/assistente/configuracao").set("Authorization", bearer(perfil))).status).toBe(403);
            expect(
                (await request(app).put("/assistente/configuracao").set("Authorization", bearer(perfil)).send({ ativo: true })).status,
            ).toBe(403);
            expect(
                (await request(app).post("/assistente/configuracao/testar").set("Authorization", bearer(perfil))).status,
            ).toBe(403);
        }
        for (const perfil of ["secretaria", "administrador"]) {
            expect((await request(app).get("/assistente/configuracao").set("Authorization", bearer(perfil))).status).toBe(200);
        }
    });

    it("nunca devolve a chave salva", async () => {
        const res = await request(app).get("/assistente/configuracao").set("Authorization", bearer("secretaria"));
        expect(res.body).toMatchObject({ possuiChave: true, chaveFinal: "9876" });
        expect(JSON.stringify(res.body)).not.toContain("segredo");
        expect(res.body).not.toHaveProperty("api_key_cifrada");
    });

    it("com o assistente desligado, o chat responde 503 e o status avisa o widget", async () => {
        const status = await request(app).get("/assistente/status").set("Authorization", bearer("aluno"));
        expect(status.body).toEqual({ ativo: false });

        const res = await request(app)
            .post("/assistente/mensagens")
            .set("Authorization", bearer("aluno"))
            .send({ mensagem: "Onde vejo minhas notas?" });
        expect(res.status).toBe(503);
    });

    it("perfil desconhecido não usa o chat", async () => {
        const res = await request(app)
            .post("/assistente/mensagens")
            .set("Authorization", bearer("visitante"))
            .send({ mensagem: "oi" });
        expect(res.status).toBe(403);
    });
});
