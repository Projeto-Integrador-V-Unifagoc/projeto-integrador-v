import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { autenticar } from '../../../middlewares/autenticacao.js';
import { soSecretaria } from '../../../middlewares/autorizacao.js';

function resposta() {
  const estado: any = { statusCode: 200, body: undefined };
  estado.status = (code: number) => (estado.statusCode = code, estado);
  estado.json = (body: unknown) => (estado.body = body, estado);
  return estado;
}

describe('autorização do módulo de professores', () => {
  it('retorna 401 quando o token não é enviado', () => {
    const res = resposta();
    let proximo = false;
    autenticar({ headers: {} } as any, res as any, () => { proximo = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(proximo, false);
  });

  it('retorna 403 para aluno e professor', () => {
    for (const tipo_usuario of ['aluno', 'professor']) {
      const res = resposta();
      let proximo = false;
      soSecretaria({ user: { tipo_usuario } } as any, res as any, () => { proximo = true; });
      assert.equal(res.statusCode, 403);
      assert.equal(proximo, false);
    }
  });

  it('permite secretaria e administrador', () => {
    for (const tipo_usuario of ['secretaria', 'administrador']) {
      const res = resposta();
      let proximo = false;
      soSecretaria({ user: { tipo_usuario } } as any, res as any, () => { proximo = true; });
      assert.equal(proximo, true);
      assert.equal(res.statusCode, 200);
    }
  });
});
