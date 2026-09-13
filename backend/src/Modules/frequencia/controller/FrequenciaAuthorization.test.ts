import { it, expect } from "vitest";
import { autenticar } from "../../../middlewares/autenticacao";

it("rotas de frequência retornam 401 sem token", () => {
  let status = 0; const res = { status(c: number) { status = c; return this; }, json() { return this; } } as any;
  autenticar({ headers: {} } as any, res, () => expect.unreachable("não deveria autorizar"));
  expect(status).toBe(401);
});
