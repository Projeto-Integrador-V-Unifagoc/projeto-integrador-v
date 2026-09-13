import { describe, it, expect } from "vitest";
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
    expect(res.statusCode).toBe(401);
    expect(proximo).toBe(false);
  });

  it("retorna 401 com token inválido", () => {
    const res = resposta();
    let proximo = false;
    autenticar({ headers: { authorization: "Bearer token-invalido" } } as any, res, () => { proximo = true; });
    expect(res.statusCode).toBe(401);
    expect(proximo).toBe(false);
  });

  it("retorna 401 quando o esquema não é Bearer", () => {
    const token = jwt.sign({ id: "aluno-1", tipo_usuario: "aluno" }, SECRET, { expiresIn: "1h" });
    const res = resposta();
    autenticar({ headers: { authorization: `Basic ${token}` } } as any, res, () => expect.unreachable("não deveria autorizar"));
    expect(res.statusCode).toBe(401);
  });

  it("aceita token válido e popula req.user a partir do JWT", () => {
    const token = jwt.sign({ id: "aluno-1", tipo_usuario: "aluno" }, SECRET, { expiresIn: "1h" });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = resposta();
    let proximo = false;
    autenticar(req, res, () => { proximo = true; });
    expect(proximo).toBe(true);
    expect(req.user.id).toBe("aluno-1");
    expect(req.user.tipo_usuario).toBe("aluno");
  });
});
