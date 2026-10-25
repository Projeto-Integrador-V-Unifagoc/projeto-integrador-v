import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Login aceita só a senha "certa"; o resto responde direto, sem banco.
vi.mock('../controller/autenticacao-controller', () => ({
  default: {
    login: (req: Request, res: Response) =>
      req.body?.senha === 'certa' ? res.status(200).json({ token: 't' }) : res.status(401).json({ error: 'Credenciais inválidas.' }),
  },
}));

vi.mock('../controller/recuperacao-senha-controller', () => ({
  default: {
    solicitar: (_req: Request, res: Response) => res.status(200).json({ ok: true }),
    redefinir: (_req: Request, res: Response) => res.status(400).json({ error: 'Token inválido.' }),
  },
}));

async function montar(): Promise<Express> {
  vi.resetModules();
  const { default: router } = await import('./auth-routes');
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(router);
  return app;
}

function login(app: Express, email: string, senha: string, ip = '198.51.100.1') {
  return request(app).post('/login').set('X-Forwarded-For', ip).send({ email, senha, recaptchaToken: 'x' });
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('RECAPTCHA_BYPASS', 'true');
  vi.stubEnv('E2E_RATE_LIMIT_BYPASS', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('rate limit nas rotas de autenticação', () => {
  it('login: 10 falhas na mesma conta bloqueiam a conta, mesmo vindo de IPs diferentes', async () => {
    const app = await montar();

    for (let i = 0; i < 10; i++) {
      expect((await login(app, 'alvo@x.com', 'errada', `198.51.100.${i + 1}`)).status).toBe(401);
    }

    const bloqueada = await login(app, 'ALVO@x.com', 'certa', '198.51.100.200');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toMatchObject({ limite: 'login-conta' });

    // Outra conta, mesmo IP de uma das tentativas: segue liberada.
    expect((await login(app, 'outra@x.com', 'certa', '198.51.100.1')).status).toBe(200);
  });

  it('login: acertos não consomem a cota da conta', async () => {
    const app = await montar();

    for (let i = 0; i < 9; i++) expect((await login(app, 'eu@x.com', 'errada', `198.51.100.${i + 1}`)).status).toBe(401);
    for (let i = 0; i < 5; i++) expect((await login(app, 'eu@x.com', 'certa', `198.51.100.${i + 50}`)).status).toBe(200);

    // A 10ª falha ainda cabe; a 11ª não.
    expect((await login(app, 'eu@x.com', 'errada', '198.51.100.100')).status).toBe(401);
    expect((await login(app, 'eu@x.com', 'errada', '198.51.100.101')).status).toBe(429);
  });

  it('login: 30 tentativas por IP, contando também os acertos', async () => {
    const app = await montar();

    for (let i = 0; i < 30; i++) expect((await login(app, `u${i}@x.com`, 'certa')).status).toBe(200);

    const bloqueada = await login(app, 'novo@x.com', 'certa');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toMatchObject({ limite: 'login' });
  });

  it.each([
    ['/recuperacao-senha', 5, 'recuperacao-senha'],
    ['/redefinir-senha', 15, 'redefinicao-senha'],
  ])('%s: bloqueia depois de %i requisições por IP', async (rota, maximo, nome) => {
    const app = await montar();
    const enviar = () => request(app).post(rota).set('X-Forwarded-For', '198.51.100.9').send({ email: 'a@x.com', recaptchaToken: 'x' });

    for (let i = 0; i < maximo; i++) expect((await enviar()).status).not.toBe(429);

    const bloqueada = await enviar();
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toMatchObject({ limite: nome });
  });
});
