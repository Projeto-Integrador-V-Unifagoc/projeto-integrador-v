import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { autenticar } from "../../../middlewares/autenticacao.js";
import { secretariaOuProfessor } from "../../../middlewares/autorizacao.js";

function resposta() {
  const estado: any = { statusCode: 200, body: undefined };
  estado.status = (code: number) => (estado.statusCode = code, estado);
  estado.json = (body: unknown) => (estado.body = body, estado);
  return estado;
}

describe("autorizacao do modulo de avaliacoes", () => {
  it("retorna 401 sem token", () => {
    const res = resposta(); let proximo = false;
    autenticar({ headers: {} } as any, res, () => { proximo = true; });
    assert.equal(res.statusCode, 401); assert.equal(proximo, false);
  });
  it("retorna 403 para aluno", () => {
    const res = resposta(); let proximo = false;
    secretariaOuProfessor({ user: { tipo_usuario: "aluno" } } as any, res, () => { proximo = true; });
    assert.equal(res.statusCode, 403); assert.equal(proximo, false);
  });
  it("permite professor, secretaria e administrador", () => {
    for (const tipo_usuario of ["professor", "secretaria", "administrador"]) {
      const res = resposta(); let proximo = false;
      secretariaOuProfessor({ user: { tipo_usuario } } as any, res, () => { proximo = true; });
      assert.equal(proximo, true); assert.equal(res.statusCode, 200);
    }
  });
});
