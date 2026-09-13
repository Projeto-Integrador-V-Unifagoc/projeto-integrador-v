import { describe, it, expect } from 'vitest';
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
    expect(res.statusCode).toBe(401);
    expect(proximo).toBe(false);
  });

  it('retorna 403 para aluno e professor', () => {
    for (const tipo_usuario of ['aluno', 'professor']) {
      const res = resposta();
      let proximo = false;
      soSecretaria({ user: { tipo_usuario } } as any, res as any, () => { proximo = true; });
      expect(res.statusCode).toBe(403);
      expect(proximo).toBe(false);
    }
  });

  it('permite secretaria e administrador', () => {
    for (const tipo_usuario of ['secretaria', 'administrador']) {
      const res = resposta();
      let proximo = false;
      soSecretaria({ user: { tipo_usuario } } as any, res as any, () => { proximo = true; });
      expect(proximo).toBe(true);
      expect(res.statusCode).toBe(200);
    }
  });
});
