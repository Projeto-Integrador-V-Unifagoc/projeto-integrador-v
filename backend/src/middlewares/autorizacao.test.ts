import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { soSecretaria, secretariaOuProfessor } from "./autorizacao";

function resposta() {
  const estado: any = { statusCode: 200, body: undefined };
  estado.status = (code: number) => ((estado.statusCode = code), estado);
  estado.json = (body: unknown) => ((estado.body = body), estado);
  return estado;
}

function executar(middleware: any, user: any) {
  const res = resposta();
  let proximo = false;
  middleware({ user } as any, res as any, () => {
    proximo = true;
  });
  return { res, proximo };
}

describe("soSecretaria", () => {
  it("libera secretaria e administrador", () => {
    for (const tipo_usuario of ["secretaria", "administrador"]) {
      const { proximo, res } = executar(soSecretaria, { tipo_usuario });
      assert.equal(proximo, true);
      assert.equal(res.statusCode, 200);
    }
  });

  it("bloqueia aluno, professor e requisicao sem usuario", () => {
    for (const user of [{ tipo_usuario: "aluno" }, { tipo_usuario: "professor" }, undefined]) {
      const { proximo, res } = executar(soSecretaria, user);
      assert.equal(proximo, false);
      assert.equal(res.statusCode, 403);
    }
  });
});

describe("secretariaOuProfessor", () => {
  it("libera secretaria, administrador e professor", () => {
    for (const tipo_usuario of ["secretaria", "administrador", "professor"]) {
      const { proximo } = executar(secretariaOuProfessor, { tipo_usuario });
      assert.equal(proximo, true);
    }
  });

  it("bloqueia aluno e requisicao sem usuario", () => {
    for (const user of [{ tipo_usuario: "aluno" }, undefined]) {
      const { proximo, res } = executar(secretariaOuProfessor, user);
      assert.equal(proximo, false);
      assert.equal(res.statusCode, 403);
    }
  });
});
