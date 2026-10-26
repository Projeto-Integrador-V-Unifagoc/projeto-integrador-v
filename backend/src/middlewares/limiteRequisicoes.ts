import type { Request, RequestHandler } from 'express';

/**
 * Rate limiting em memória com o algoritmo de janela deslizante por contador
 * (sliding window counter): guarda a contagem da janela fixa atual e da
 * anterior e estima as requisições dos últimos `janelaMs` ponderando a janela
 * anterior pela fração que ainda cai dentro da janela deslizante.
 *
 * Fica entre a janela fixa (barata, mas permite rajada dupla na virada da
 * janela) e o log de timestamps (exato, mas guarda um registro por requisição):
 * usa dois números por chave e não deixa a rajada da virada passar.
 *
 * O estado é por processo. Com mais de uma instância do backend, cada uma
 * aplica o limite de forma independente.
 */

export interface OpcoesLimite {
  /** Identifica a política na resposta 429 (o frontend usa para saber o escopo do bloqueio). */
  nome: string;
  /** Requisições permitidas por chave dentro da janela. */
  maximo: number;
  janelaMs: number;
  /** Chave de agrupamento. Retornar `undefined` deixa a requisição passar sem contar. */
  chave?: (req: Request) => string | undefined;
  /** Conta só as respostas com erro (status >= 400), ex.: tentativas de login que falharam. */
  ignorarSucesso?: boolean;
  mensagem?: string;
  /** Teto de chaves em memória; ao atingir, descarta a mais antiga. */
  maximoDeChaves?: number;
  /** Relógio injetável para os testes. */
  agora?: () => number;
}

interface Contador {
  inicioJanela: number;
  atual: number;
  anterior: number;
}

const MENSAGEM_PADRAO = 'Muitas solicitações. Aguarde e tente novamente.';

export function chavePorIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'desconhecido';
}

/** Agrupa por um campo do corpo (normalizado), ex.: o e-mail no login. */
export function chavePorCampoDoCorpo(campo: string) {
  return (req: Request): string | undefined => {
    const valor: unknown = req.body?.[campo];
    if (typeof valor !== 'string' || !valor.trim()) return undefined;
    return `${campo}:${valor.trim().toLowerCase()}`;
  };
}

function bypassAtivo(): boolean {
  // Bypass explícito apenas no processo isolado da suíte E2E.
  return process.env.NODE_ENV === 'test' && process.env.E2E_RATE_LIMIT_BYPASS === 'true';
}

export function criarLimitador(opcoes: OpcoesLimite): RequestHandler {
  const {
    nome,
    maximo,
    janelaMs,
    chave = chavePorIp,
    ignorarSucesso = false,
    mensagem = MENSAGEM_PADRAO,
    maximoDeChaves = 50_000,
    agora = Date.now,
  } = opcoes;

  const contadores = new Map<string, Contador>();
  let ultimaLimpeza = agora();

  // Alinha o contador à janela fixa vigente, rolando a contagem para "anterior".
  function sincronizar(contador: Contador, instante: number) {
    const janelasPassadas = Math.floor((instante - contador.inicioJanela) / janelaMs);
    if (janelasPassadas <= 0) return;
    contador.anterior = janelasPassadas === 1 ? contador.atual : 0;
    contador.atual = 0;
    contador.inicioJanela += janelasPassadas * janelaMs;
  }

  function estimar(contador: Contador, instante: number): number {
    const decorrido = instante - contador.inicioJanela;
    return contador.anterior * (1 - decorrido / janelaMs) + contador.atual;
  }

  // Milissegundos até caber mais uma requisição (estimativa <= maximo - 1).
  function esperaAteLiberar(contador: Contador, instante: number): number {
    const decorrido = instante - contador.inicioJanela;
    const restanteDaJanela = janelaMs - decorrido;
    const folga = maximo - 1;

    if (contador.atual > folga) {
      // Na próxima janela, "atual" vira "anterior" e decai linearmente.
      return restanteDaJanela + janelaMs * (1 - folga / contador.atual);
    }

    const espera = janelaMs * (1 - (folga - contador.atual) / contador.anterior) - decorrido;
    return Math.min(Math.max(espera, 0), restanteDaJanela);
  }

  function limpar(instante: number) {
    if (instante - ultimaLimpeza < janelaMs) return;
    ultimaLimpeza = instante;
    for (const [chaveContador, contador] of contadores) {
      if (instante - contador.inicioJanela >= 2 * janelaMs) contadores.delete(chaveContador);
    }
  }

  return (req, res, next) => {
    if (bypassAtivo()) return next();

    const chaveRequisicao = chave(req);
    if (chaveRequisicao === undefined) return next();

    const instante = agora();
    limpar(instante);

    let contador = contadores.get(chaveRequisicao);
    if (!contador) {
      if (contadores.size >= maximoDeChaves) {
        const maisAntiga = contadores.keys().next().value;
        if (maisAntiga !== undefined) contadores.delete(maisAntiga);
      }
      contador = { inicioJanela: instante, atual: 0, anterior: 0 };
      contadores.set(chaveRequisicao, contador);
    }

    sincronizar(contador, instante);
    const estimativa = estimar(contador, instante);

    res.setHeader('RateLimit-Policy', `${maximo};w=${Math.ceil(janelaMs / 1000)}`);
    res.setHeader('RateLimit-Limit', maximo);

    if (estimativa + 1 > maximo) {
      const segundos = Math.max(1, Math.ceil(esperaAteLiberar(contador, instante) / 1000));
      res.setHeader('RateLimit-Remaining', 0);
      res.setHeader('RateLimit-Reset', segundos);
      res.setHeader('Retry-After', segundos);
      res.status(429).json({ error: mensagem, limite: nome, tentarNovamenteEm: segundos });
      return;
    }

    contador.atual += 1;
    const janelaDaContagem = contador.inicioJanela;

    res.setHeader('RateLimit-Remaining', Math.max(0, Math.floor(maximo - estimativa - 1)));
    res.setHeader('RateLimit-Reset', Math.ceil((janelaMs - (instante - contador.inicioJanela)) / 1000));

    if (ignorarSucesso) {
      const registrado = contador;
      res.on('finish', () => {
        if (res.statusCode < 400 && registrado.inicioJanela === janelaDaContagem && registrado.atual > 0) {
          registrado.atual -= 1;
        }
      });
    }

    next();
  };
}
