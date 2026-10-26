import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
});

async function cabecalhosDoLimiteGlobal(env: Record<string, string>) {
  vi.resetModules();
  for (const [nome, valor] of Object.entries(env)) vi.stubEnv(nome, valor);
  const { limiteGlobal } = await import('./limitesRequisicoes');

  const app = express();
  app.get('/', limiteGlobal, (_req, res) => { res.sendStatus(204); });
  const res = await request(app).get('/');
  return { limite: res.headers['ratelimit-limit'], politica: res.headers['ratelimit-policy'] };
}

describe('limite global configurável por ambiente', () => {
  it('usa RATE_LIMIT_GLOBAL_MAX e RATE_LIMIT_GLOBAL_JANELA_MS quando válidos', async () => {
    const cabecalhos = await cabecalhosDoLimiteGlobal({
      RATE_LIMIT_GLOBAL_MAX: '250',
      RATE_LIMIT_GLOBAL_JANELA_MS: '30000',
    });
    expect(cabecalhos).toEqual({ limite: '250', politica: '250;w=30' });
  });

  it.each(['', '0', '-5', '2.5', 'abc'])('valor inválido %j cai no padrão (1000 por minuto)', async (valor) => {
    const cabecalhos = await cabecalhosDoLimiteGlobal({
      RATE_LIMIT_GLOBAL_MAX: valor,
      RATE_LIMIT_GLOBAL_JANELA_MS: valor,
    });
    expect(cabecalhos).toEqual({ limite: '1000', politica: '1000;w=60' });
  });
});
