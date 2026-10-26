import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chavePorCampoDoCorpo, criarLimitador, type OpcoesLimite } from './limiteRequisicoes';

afterEach(() => { vi.unstubAllEnvs(); });

function relogio(inicio = 1_000_000) {
  let instante = inicio;
  return {
    agora: () => instante,
    avancar: (ms: number) => { instante += ms; },
  };
}

function montar(limitador: RequestHandler, status = 204) {
  const app = express();
  app.use(express.json());
  app.post('/', limitador, (_req, res) => { res.sendStatus(status); });
  return app;
}

function limitador(opcoes: Partial<OpcoesLimite> & { agora: () => number }) {
  return criarLimitador({ nome: 'teste', maximo: 2, janelaMs: 1000, ...opcoes });
}

describe('criarLimitador', () => {
  it('permite até o máximo e responde 429 com Retry-After e corpo padronizado', async () => {
    const tempo = relogio();
    const app = montar(limitador({ agora: tempo.agora, mensagem: 'Calma.' }));

    const primeira = await request(app).post('/');
    expect(primeira.status).toBe(204);
    expect(primeira.headers['ratelimit-limit']).toBe('2');
    expect(primeira.headers['ratelimit-remaining']).toBe('1');
    expect(primeira.headers['ratelimit-policy']).toBe('2;w=1');

    expect((await request(app).post('/')).status).toBe(204);

    // Volta a caber 1 quando a janela vira e metade dela passa: 2 * 0.5 + 0 <= 1 → 1,5s.
    const bloqueada = await request(app).post('/');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers['retry-after']).toBe('2');
    expect(bloqueada.headers['ratelimit-remaining']).toBe('0');
    expect(bloqueada.body).toEqual({ error: 'Calma.', limite: 'teste', tentarNovamenteEm: 2 });
  });

  it('requisições bloqueadas não consomem a cota', async () => {
    const tempo = relogio();
    const app = montar(limitador({ maximo: 1, agora: tempo.agora }));

    expect((await request(app).post('/')).status).toBe(204);
    for (let i = 0; i < 5; i++) expect((await request(app).post('/')).status).toBe(429);

    tempo.avancar(2000);
    expect((await request(app).post('/')).status).toBe(204);
  });

  it('janela deslizante: a contagem da janela anterior decai em vez de zerar na virada', async () => {
    const tempo = relogio();
    const app = montar(limitador({ maximo: 4, agora: tempo.agora }));

    for (let i = 0; i < 4; i++) expect((await request(app).post('/')).status).toBe(204);

    // Logo após a virada, 4 * (1 - 0.25) = 3 ainda contam: só 1 cabe.
    tempo.avancar(1250);
    expect((await request(app).post('/')).status).toBe(204);
    const bloqueada = await request(app).post('/');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers['retry-after']).toBe('1');

    // Com 75% da janela anterior fora, 4 * 0.25 + 1 = 2 → cabem mais 2.
    tempo.avancar(500);
    expect((await request(app).post('/')).status).toBe(204);
    expect((await request(app).post('/')).status).toBe(204);
    expect((await request(app).post('/')).status).toBe(429);
  });

  it('libera tudo depois de duas janelas sem uso', async () => {
    const tempo = relogio();
    const app = montar(limitador({ agora: tempo.agora }));

    await request(app).post('/');
    await request(app).post('/');
    tempo.avancar(2000);
    expect((await request(app).post('/')).status).toBe(204);
    expect((await request(app).post('/')).status).toBe(204);
  });

  it('separa a contagem por chave', async () => {
    const tempo = relogio();
    const app = montar(limitador({ maximo: 1, agora: tempo.agora, chave: chavePorCampoDoCorpo('email') }));

    expect((await request(app).post('/').send({ email: 'a@x.com' })).status).toBe(204);
    expect((await request(app).post('/').send({ email: ' A@X.com ' })).status).toBe(429);
    expect((await request(app).post('/').send({ email: 'b@x.com' })).status).toBe(204);
  });

  it('não limita quando a função de chave não identifica a requisição', async () => {
    const tempo = relogio();
    const app = montar(limitador({ maximo: 1, agora: tempo.agora, chave: chavePorCampoDoCorpo('email') }));

    for (let i = 0; i < 3; i++) expect((await request(app).post('/').send({})).status).toBe(204);
  });

  it('com ignorarSucesso conta só as respostas de erro', async () => {
    const tempo = relogio();
    const opcoes = { maximo: 2, agora: tempo.agora, ignorarSucesso: true };

    const sucesso = montar(limitador(opcoes), 200);
    for (let i = 0; i < 5; i++) expect((await request(sucesso).post('/')).status).toBe(200);

    const falha = montar(limitador(opcoes), 401);
    expect((await request(falha).post('/')).status).toBe(401);
    expect((await request(falha).post('/')).status).toBe(401);
    expect((await request(falha).post('/')).status).toBe(429);
  });

  it('com ignorarSucesso um acerto que termina depois da virada não desconta da janela nova', async () => {
    const tempo = relogio();
    let liberar!: () => void;
    let chegou!: () => void;
    const segurada = new Promise<void>((resolve) => { liberar = resolve; });
    const naRota = new Promise<void>((resolve) => { chegou = resolve; });

    const app = express();
    app.post('/', limitador({ maximo: 3, agora: tempo.agora, ignorarSucesso: true }), async (req, res) => {
      if (req.query.lenta) {
        chegou();
        await segurada;
        res.sendStatus(200);
        return;
      }
      res.sendStatus(401);
    });

    const lenta = request(app).post('/?lenta=1').then((r) => r);
    await naRota;

    // A virada passa a contagem para "anterior" (1); a falha conta na janela nova.
    tempo.avancar(1000);
    expect((await request(app).post('/')).status).toBe(401);

    liberar();
    expect((await lenta).status).toBe(200);

    // Se o acerto tivesse descontado a falha da janela nova, a 4ª ainda passaria: 1 + 2 = 3 → bloqueia.
    expect((await request(app).post('/')).status).toBe(401);
    expect((await request(app).post('/')).status).toBe(429);
  });

  it('ao atingir o teto de chaves descarta a mais antiga em vez de bloquear', async () => {
    const tempo = relogio();
    const app = montar(limitador({
      maximo: 1,
      maximoDeChaves: 2,
      agora: tempo.agora,
      chave: chavePorCampoDoCorpo('email'),
    }));

    await request(app).post('/').send({ email: 'a' });
    await request(app).post('/').send({ email: 'b' });
    expect((await request(app).post('/').send({ email: 'c' })).status).toBe(204);
    // "a" foi descartada, então volta a ter cota.
    expect((await request(app).post('/').send({ email: 'a' })).status).toBe(204);
  });

  it.each([
    ['test', 'true', 204],
    ['test', 'false', 429],
    ['production', 'true', 429],
    ['development', 'true', 429],
  ])('no ambiente %s com bypass %s a 2ª requisição retorna %s', async (ambiente, bypass, esperado) => {
    vi.stubEnv('NODE_ENV', ambiente);
    vi.stubEnv('E2E_RATE_LIMIT_BYPASS', bypass);
    const tempo = relogio();
    const app = montar(limitador({ maximo: 1, agora: tempo.agora }));

    expect((await request(app).post('/')).status).toBe(204);
    expect((await request(app).post('/')).status).toBe(esperado);
  });
});
