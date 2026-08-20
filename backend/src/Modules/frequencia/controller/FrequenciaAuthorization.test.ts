import assert from "node:assert/strict";
import { it } from "node:test";
import { autenticar } from "../../../middlewares/autenticacao";

it("rotas de frequência retornam 401 sem token", () => {
  let status = 0; const res = { status(c: number) { status = c; return this; }, json() { return this; } } as any;
  autenticar({ headers: {} } as any, res, () => assert.fail("não deveria autorizar"));
  assert.equal(status, 401);
});
