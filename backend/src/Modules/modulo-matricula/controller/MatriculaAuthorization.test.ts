import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { autenticar } from "../../../middlewares/autenticacao";
import { somenteSecretariaOuAdmin } from "../middlewares/perfilAdministrativo";

function resposta() {
    const estado: any = { statusCode: 200 };
    estado.status = (statusCode: number) => (estado.statusCode = statusCode, estado);
    estado.json = () => estado;
    return estado;
}

describe("autorização do módulo de matrícula", () => {
    it("retorna 401 sem token", () => {
        const res = resposta();
        autenticar({ headers: {} } as any, res, () => assert.fail("não deveria autorizar"));
        assert.equal(res.statusCode, 401);
    });

    it("retorna 401 quando o cabeçalho não está no formato Bearer", () => {
        const res = resposta();
        autenticar({ headers: { authorization: "token-solto" } } as any, res, () => assert.fail("não deveria autorizar"));
        assert.equal(res.statusCode, 401);
    });

    it("permite somente secretaria e administrador", () => {
        for (const tipo_usuario of ["aluno", "professor", "secretaria", "administrador"]) {
            const res = resposta();
            let autorizado = false;
            somenteSecretariaOuAdmin({ user: { tipo_usuario } } as any, res, () => { autorizado = true; });
            assert.equal(autorizado, ["secretaria", "administrador"].includes(tipo_usuario));
        }
    });

    it("normaliza caixa e espaços do perfil vindo do token", () => {
        for (const tipo_usuario of [" Secretaria ", "ADMINISTRADOR"]) {
            const res = resposta();
            let autorizado = false;
            somenteSecretariaOuAdmin({ user: { tipo_usuario } } as any, res, () => { autorizado = true; });
            assert.equal(autorizado, true);
        }
    });

    it("retorna 403 quando não há usuário na requisição", () => {
        const res = resposta();
        somenteSecretariaOuAdmin({} as any, res, () => assert.fail("não deveria autorizar"));
        assert.equal(res.statusCode, 403);
    });
});
