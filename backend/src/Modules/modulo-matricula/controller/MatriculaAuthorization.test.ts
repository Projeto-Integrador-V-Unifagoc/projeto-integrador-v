import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { autenticar } from "../../../middlewares/autenticacao";
import { soSecretaria } from "../../../middlewares/autorizacao";

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

    it("permite somente secretaria e administrador", () => {
        for (const tipo_usuario of ["aluno", "professor", "secretaria", "administrador"]) {
            const res = resposta(); let autorizado = false;
            soSecretaria({ user: { tipo_usuario } } as any, res, () => { autorizado = true; });
            assert.equal(autorizado, ["secretaria", "administrador"].includes(tipo_usuario));
        }
    });
});
