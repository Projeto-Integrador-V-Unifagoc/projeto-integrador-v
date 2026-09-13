import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "vitest";
import * as jwt from "jsonwebtoken";
import { autenticar } from "./autenticacao";

const SECRET = "segredo-de-teste-com-tamanho-suficiente-1";

function resposta() {
  const estado: any = { statusCode: 200, body: undefined, headers: {} as Record<string, string> };
  estado.status = (code: number) => ((estado.statusCode = code), estado);
  estado.json = (body: unknown) => ((estado.body = body), estado);
  estado.setHeader = (nome: string, valor: string) => {
    estado.headers[nome] = valor;
  };
  return estado;
}

describe("autenticar", () => {
  let jwtSecret: string | undefined;

  beforeEach(() => {
    jwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    if (jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwtSecret;
  });

  it("retorna 401 quando o cabecalho Authorization nao e enviado", () => {
    const res = resposta();
    let proximo = false;
    autenticar({ headers: {} } as any, res as any, () => (proximo = true));
    assert.equal(res.statusCode, 401);
    assert.equal(proximo, false);
  });

  it("retorna 401 quando o formato nao e 'Bearer <token>'", () => {
    for (const authorization of ["tokensozinho", "Basic abc def", "Bearer "]) {
      const res = resposta();
      let proximo = false;
      autenticar({ headers: { authorization } } as any, res as any, () => (proximo = true));
      assert.equal(res.statusCode, 401);
      assert.equal(proximo, false);
    }
  });

  it("retorna 401 quando o token e invalido", () => {
    const res = resposta();
    let proximo = false;
    autenticar({ headers: { authorization: "Bearer token.invalido" } } as any, res as any, () => (proximo = true));
    assert.equal(res.statusCode, 401);
    assert.equal(proximo, false);
  });

  it("aceita token valido, popula req.user, renova o token e chama next", () => {
    const token = jwt.sign({ id: "u1", tipo_usuario: "secretaria" }, SECRET, { expiresIn: "1h" });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = resposta();
    let proximo = false;
    autenticar(req, res as any, () => (proximo = true));
    assert.equal(proximo, true);
    assert.deepEqual(req.user, { id: "u1", tipo_usuario: "secretaria" });
    assert.ok(res.headers["x-token-renovado"]);
  });
});
