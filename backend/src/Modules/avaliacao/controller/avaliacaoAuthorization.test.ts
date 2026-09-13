import { describe, it, expect } from "vitest";
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
    expect(res.statusCode).toBe(401); expect(proximo).toBe(false);
  });
  it("retorna 403 para aluno", () => {
    const res = resposta(); let proximo = false;
    secretariaOuProfessor({ user: { tipo_usuario: "aluno" } } as any, res, () => { proximo = true; });
    expect(res.statusCode).toBe(403); expect(proximo).toBe(false);
  });
  it("permite professor, secretaria e administrador", () => {
    for (const tipo_usuario of ["professor", "secretaria", "administrador"]) {
      const res = resposta(); let proximo = false;
      secretariaOuProfessor({ user: { tipo_usuario } } as any, res, () => { proximo = true; });
      expect(proximo).toBe(true); expect(res.statusCode).toBe(200);
    }
  });
});
