import { describe, it, expect } from "vitest";
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
        autenticar({ headers: {} } as any, res, () => expect.unreachable("não deveria autorizar"));
        expect(res.statusCode).toBe(401);
    });

    it("permite somente secretaria e administrador", () => {
        for (const tipo_usuario of ["aluno", "professor", "secretaria", "administrador"]) {
            const res = resposta(); let autorizado = false;
            soSecretaria({ user: { tipo_usuario } } as any, res, () => { autorizado = true; });
            expect(autorizado).toBe(["secretaria", "administrador"].includes(tipo_usuario));
        }
    });
});
