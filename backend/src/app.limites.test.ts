import request from 'supertest';
import type { Express } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Sem banco: o SMTP salvo é carregado no import do app.
vi.mock('./Modules/configuracao-email/service/ConfiguracaoSmtpService', () => ({
  ConfiguracaoSmtpService: class {
    aplicarNoEmailService() { return Promise.resolve(); }
  },
}));

async function carregarApp(env: Record<string, string> = {}): Promise<Express> {
  vi.resetModules();
  for (const [nome, valor] of Object.entries(env)) vi.stubEnv(nome, valor);
  return (await import('./app')).app;
}

beforeEach(() => {
  vi.stubEnv('E2E_RATE_LIMIT_BYPASS', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('rate limit aplicado no app', () => {
  it('limite global vale para as rotas da API e usa RATE_LIMIT_GLOBAL_MAX', async () => {
    const app = await carregarApp({ RATE_LIMIT_GLOBAL_MAX: '3' });

    // GET /me sem token responde 401 sem tocar no banco.
    for (let i = 0; i < 3; i++) expect((await request(app).get('/me')).status).toBe(401);

    const bloqueada = await request(app).get('/me');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toMatchObject({ limite: 'global' });
    expect(bloqueada.headers['retry-after']).toBeDefined();
  });

  it('/health nunca é limitado', async () => {
    const app = await carregarApp({ RATE_LIMIT_GLOBAL_MAX: '1' });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeUndefined();
    }
  });

  it('CORS expõe os cabeçalhos de rate limit para o frontend ler o Retry-After', async () => {
    const app = await carregarApp();

    const res = await request(app).get('/me').set('Origin', 'https://portal.unieduca.net.br');
    const expostos = String(res.headers['access-control-expose-headers']).split(',').map((h) => h.trim());
    expect(expostos).toEqual(
      expect.arrayContaining(['Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'RateLimit-Policy']),
    );
  });

  it('com TRUST_PROXY o contador é por IP do cliente, não do proxy', async () => {
    const app = await carregarApp({ RATE_LIMIT_GLOBAL_MAX: '1', TRUST_PROXY: '1' });

    expect((await request(app).get('/me').set('X-Forwarded-For', '203.0.113.1')).status).toBe(401);
    expect((await request(app).get('/me').set('X-Forwarded-For', '203.0.113.1')).status).toBe(429);
    expect((await request(app).get('/me').set('X-Forwarded-For', '203.0.113.2')).status).toBe(401);
  });

  it('sem TRUST_PROXY o X-Forwarded-For é ignorado (não dá para fugir do limite forjando o cabeçalho)', async () => {
    const app = await carregarApp({ RATE_LIMIT_GLOBAL_MAX: '1' });

    expect((await request(app).get('/me').set('X-Forwarded-For', '203.0.113.1')).status).toBe(401);
    expect((await request(app).get('/me').set('X-Forwarded-For', '203.0.113.2')).status).toBe(429);
  });
});
