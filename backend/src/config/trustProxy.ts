/**
 * Converte TRUST_PROXY no valor de `app.set('trust proxy', ...)`.
 *
 * Atrás de um proxy reverso, sem essa configuração `req.ip` é sempre o IP do
 * proxy e todos os clientes dividem o mesmo limite de requisições. Confiar em
 * proxies demais permite ao cliente forjar o IP via X-Forwarded-For, por isso o
 * padrão é não confiar em nenhum.
 *
 * - vazio / "false" → false
 * - "true"          → true (confia em toda a cadeia; só use se o proxy sobrescreve o cabeçalho)
 * - número ("1")    → quantidade de proxies à frente do backend
 * - outro texto     → lista de IPs/sub-redes aceita pelo Express (ex.: "loopback, uniquelocal")
 */
export function lerTrustProxy(valor: string | undefined): boolean | number | string {
  const texto = valor?.trim() ?? '';

  if (!texto || texto.toLowerCase() === 'false') return false;
  if (texto.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(texto)) return Number(texto);
  return texto;
}
