import express from 'express';
import request from 'supertest';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { limitarSolicitacoes, validarRecaptcha } from './recaptcha';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
const post = vi.mocked(axios.post);
const app = express();
app.use(express.json());
app.post('/protegida', validarRecaptcha, (_req, res) => res.sendStatus(204));

beforeEach(() => {
  vi.stubEnv('RECAPTCHA_SECRET_KEY', 'segredo-teste');
  vi.stubEnv('RECAPTCHA_ALLOWED_HOSTNAMES', 'unieduca.net.br');
  post.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('validação reCAPTCHA', () => {
  it('rejeita token ausente sem consultar Google', async () => {
    expect((await request(app).post('/protegida').send({})).status).toBe(400);
    expect(post).not.toHaveBeenCalled();
  });
  it('bloqueia quando falta a configuração', async () => {
    vi.stubEnv('RECAPTCHA_SECRET_KEY', '');
    expect((await request(app).post('/protegida').send({ recaptchaToken: 'token' })).status).toBe(503);
  });
  it.each([
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'outro.example' },
    { success: true },
  ])('rejeita resposta inválida: %j', async data => {
    post.mockResolvedValue({ data });
    expect((await request(app).post('/protegida').send({ recaptchaToken: 'token' })).status).toBe(400);
  });
  it('aceita somente sucesso no domínio permitido', async () => {
    post.mockResolvedValue({ data: { success: true, hostname: 'unieduca.net.br' } });
    expect((await request(app).post('/protegida').send({ recaptchaToken: 'token' })).status).toBe(204);
    expect(post).toHaveBeenCalledWith('https://www.google.com/recaptcha/api/siteverify',
      'secret=segredo-teste&response=token', expect.objectContaining({ timeout: 8000 }));
  });
  it('não libera a solicitação quando o Google está indisponível', async () => {
    post.mockRejectedValue(new Error('timeout'));
    expect((await request(app).post('/protegida').send({ recaptchaToken: 'token' })).status).toBe(503);
  });
  it('limita solicitações e libera após a janela', async () => {
    const limitado = express();
    limitado.get('/', limitarSolicitacoes(1, 1000), (_req, res) => res.sendStatus(204));
    const agora = Date.now();
    const relogio = vi.spyOn(Date, 'now').mockReturnValue(agora);
    try {
      expect((await request(limitado).get('/')).status).toBe(204);
      const bloqueado = await request(limitado).get('/');
      expect(bloqueado.status).toBe(429);
      expect(bloqueado.headers['retry-after']).toBe('1');
      relogio.mockReturnValue(agora + 1001);
      expect((await request(limitado).get('/')).status).toBe(204);
    } finally { relogio.mockRestore(); }
  });
});

it.each([
  ['test', 'true', 204],
  ['test', 'false', 429],
  ['production', 'true', 429],
  ['development', 'true', 429],
])('limite no ambiente %s com bypass %s retorna %s', async (ambiente, bypass, esperado) => {
  vi.stubEnv('NODE_ENV', ambiente);
  vi.stubEnv('E2E_RATE_LIMIT_BYPASS', bypass);
  const limitado = express();
  limitado.get('/', limitarSolicitacoes(1), (_req, res) => res.sendStatus(204));
  expect((await request(limitado).get('/')).status).toBe(204);
  expect((await request(limitado).get('/')).status).toBe(esperado);
});