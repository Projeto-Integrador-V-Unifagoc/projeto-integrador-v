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
