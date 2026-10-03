import axios from 'axios';
import type { RequestHandler } from 'express';

export const validarRecaptcha: RequestHandler = async (
  req,
  res,
  next
) => {
  // Ignora o reCAPTCHA somente no ambiente automatizado de testes.
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.RECAPTCHA_BYPASS === 'true'
  ) {
    return next();
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;

  const hosts = (
    process.env.RECAPTCHA_ALLOWED_HOSTNAMES ||
    'unieduca.net.br,portal.unieduca.net.br,www.unieduca.net.br'
  )
    .split(',')
    .map((hostname) => hostname.trim());

  const token = req.body?.recaptchaToken;

  if (!secret) {
    res.status(503).json({
      error: 'Verificação de segurança indisponível.',
    });
    return;
  }

  if (
    typeof token !== 'string' ||
    !token.trim() ||
    token.length > 4096
  ) {
    res.status(400).json({
      error:
        'Conclua a verificação de segurança e tente novamente.',
    });
    return;
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    }).toString();

    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      body,
      {
        timeout: 8000,
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
      }
    );

    if (
      data.success !== true ||
      !hosts.includes(data.hostname)
    ) {
      res.status(400).json({
        error:
          'Verificação de segurança inválida ou expirada. Tente novamente.',
      });
      return;
    }

    next();
  } catch {
    res.status(503).json({
      error:
        'Não foi possível verificar a segurança. Tente novamente.',
    });
  }
};

// Limite local de solicitações por endereço IP.
export function limitarSolicitacoes(
  maximo: number,
  janelaMs = 15 * 60 * 1000
): RequestHandler {
  const entradas = new Map<
    string,
    {
      quantidade: number;
      expira: number;
    }
  >();

  return (req, res, next) => {
    // Bypass explícito apenas no processo isolado da suíte E2E.
    if (process.env.NODE_ENV === 'test' && process.env.E2E_RATE_LIMIT_BYPASS === 'true') {
      return next();
    }
    const agora = Date.now();

    for (const [chave, entrada] of entradas) {
      if (entrada.expira <= agora) {
        entradas.delete(chave);
      }
    }

    const chave =
      req.ip ||
      req.socket.remoteAddress ||
      'desconhecido';

    let entrada = entradas.get(chave);

    if (!entrada) {
      if (entradas.size >= 10000) {
        res.status(429).json({
          error:
            'Muitas solicitações. Tente novamente mais tarde.',
        });
        return;
      }

      entrada = {
        quantidade: 0,
        expira: agora + janelaMs,
      };

      entradas.set(chave, entrada);
    }

    entrada.quantidade += 1;

    if (entrada.quantidade > maximo) {
      res.setHeader(
        'Retry-After',
        Math.ceil((entrada.expira - agora) / 1000)
      );

      res.status(429).json({
        error:
          'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      });
      return;
    }

    next();
  };
}