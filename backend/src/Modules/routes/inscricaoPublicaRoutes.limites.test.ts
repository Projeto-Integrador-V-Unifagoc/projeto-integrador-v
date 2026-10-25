import os from 'node:os';
import path from 'node:path';
import express, { type Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// As requisições abaixo param na validação da rota, antes de qualquer consulta ao banco.
async function montar(): Promise<Express> {
  vi.resetModules();
  const { inscricaoPublicaRouter } = await import('./inscricaoPublicaRoutes');
  const app = express();
  app.use(express.json());
  app.use(inscricaoPublicaRouter);
  return app;
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('RECAPTCHA_BYPASS', 'true');
  vi.stubEnv('E2E_RATE_LIMIT_BYPASS', '');
  vi.stubEnv('UPLOAD_DIR', path.join(os.tmpdir(), 'unieduca-limites-test'));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function esgotar(enviar: () => request.Test, maximo: number) {
  for (let i = 0; i < maximo; i++) expect((await enviar()).status).toBe(400);
}

describe('rate limit nas rotas públicas de inscrição', () => {
  it('consultas de CPF e e-mail dividem a mesma cota de 60', async () => {
    const app = await montar();

    await esgotar(() => request(app).get('/publico/inscricao/cpf/123'), 30);
    await esgotar(() => request(app).get('/publico/inscricao/email').query({ valor: 'invalido' }), 30);

    const bloqueada = await request(app).get('/publico/inscricao/cpf/123');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toMatchObject({ limite: 'consulta-publica' });
  });

  it('inscrição: 10 envios por IP', async () => {
    const app = await montar();
    const enviar = () => request(app).post('/publico/inscricao').send({ recaptchaToken: 'x' });

    await esgotar(enviar, 10);

    const bloqueada = await enviar();
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toMatchObject({ limite: 'inscricao' });
  });

  it('envio de documentos: 40 por IP, contando também a consulta de documentos recusados', async () => {
    const app = await montar();

    await esgotar(() => request(app).post('/publico/inscricao/documentos').field('aluno_id', '1'), 40);

    const bloqueada = await request(app).get('/publico/inscricao/1/documentos-recusados');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toMatchObject({ limite: 'documentos-publicos' });
  });
});
