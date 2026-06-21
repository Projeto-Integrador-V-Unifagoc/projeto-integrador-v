import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as jwt from "jsonwebtoken";
import { autenticar } from "../../../middlewares/autenticacao.js";

function resposta() {
  const estado: any = { statusCode: 200, body: undefined };
  estado.status = (code: number) => (estado.statusCode = code, estado);
  estado.json = (body: unknown) => (estado.body = body, estado);
  estado.setHeader = () => estado;
  return estado;
}

const SECRET = "segredo-de-testes-com-mais-de-32-caracteres";
process.env.JWT_SECRET = SECRET;

describe("autenticação das rotas /me do aluno", () => {
  it("retorna 401 sem token", () => {
    const res = resposta();
    let proximo = false;
    autenticar({ headers: {} } as any, res, () => { proximo = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(proximo, false);
  });

  it("retorna 401 com token inválido", () => {
    const res = resposta();
    let proximo = false;
    autenticar({ headers: { authorization: "Bearer token-invalido" } } as any, res, () => { proximo = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(proximo, false);
  });

  it("retorna 401 quando o esquema não é Bearer", () => {
    const token = jwt.sign({ id: "aluno-1", tipo_usuario: "aluno" }, SECRET, { expiresIn: "1h" });
    const res = resposta();
    autenticar({ headers: { authorization: `Basic ${token}` } } as any, res, () => assert.fail("não deveria autorizar"));
    assert.equal(res.statusCode, 401);
  });

  it("aceita token válido e popula req.user a partir do JWT", () => {
    const token = jwt.sign({ id: "aluno-1", tipo_usuario: "aluno" }, SECRET, { expiresIn: "1h" });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = resposta();
    let proximo = false;
    autenticar(req, res, () => { proximo = true; });
    assert.equal(proximo, true);
    assert.equal(req.user.id, "aluno-1");
    assert.equal(req.user.tipo_usuario, "aluno");
  });
});
