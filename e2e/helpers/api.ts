import type { APIRequestContext } from "@playwright/test";
import { config } from "./config.js";
import { validarUrlHttpTeste } from "./isolamento.js";

export interface Resposta<T = any> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: T;
}

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface OpcoesReq {
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** multipart para upload de documentos. */
  multipart?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Cliente HTTP fino sobre o `APIRequestContext` do Playwright (spec §4.1).
 * Sempre retorna status + corpo já desserializado, para asserções de contrato
 * (spec §14) sem repetição de boilerplate nos specs.
 */
export class Api {
  constructor(
    private readonly ctx: APIRequestContext,
    private readonly tokenPadrao?: string | null,
    private readonly baseUrl = config.apiUrl,
  ) { validarUrlHttpTeste(baseUrl); }

  /** Deriva um cliente com um token padrão (perfil autenticado). */
  comToken(token?: string | null): Api {
    return new Api(this.ctx, token, this.baseUrl);
  }

  get(path: string, opcoes: OpcoesReq = {}) {
    return this.requisicao("GET", path, opcoes);
  }
  post(path: string, opcoes: OpcoesReq = {}) {
    return this.requisicao("POST", path, opcoes);
  }
  put(path: string, opcoes: OpcoesReq = {}) {
    return this.requisicao("PUT", path, opcoes);
  }
  patch(path: string, opcoes: OpcoesReq = {}) {
    return this.requisicao("PATCH", path, opcoes);
  }
  del(path: string, opcoes: OpcoesReq = {}) {
    return this.requisicao("DELETE", path, opcoes);
  }

  private async requisicao<T = any>(
    metodo: Metodo,
    path: string,
    opcoes: OpcoesReq,
  ): Promise<Resposta<T>> {
    const url = montarUrl(path, this.baseUrl, opcoes.query);
    const headers: Record<string, string> = { ...(opcoes.headers ?? {}) };
    const token = opcoes.token === undefined ? this.tokenPadrao : opcoes.token;
    if (token) headers.Authorization = `Bearer ${token}`;

    const resposta = await this.ctx.fetch(url, {
      method: metodo,
      maxRedirects: 0,
      headers,
      ...(opcoes.body !== undefined ? { data: opcoes.body } : {}),
      ...(opcoes.multipart !== undefined ? { multipart: opcoes.multipart as any } : {}),
    });

    const texto = await resposta.text();
    let body: any = texto;
    if (texto) {
      try {
        body = JSON.parse(texto);
      } catch {
        body = texto;
      }
    } else {
      body = null;
    }

    return {
      status: resposta.status(),
      ok: resposta.ok(),
      headers: resposta.headers(),
      body,
    };
  }
}

function montarUrl(
  path: string,
  baseUrl: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const destino = new URL(path, `${validarUrlHttpTeste(baseUrl)}/`);
  validarUrlHttpTeste(destino.toString());
  if (!query) return destino.toString();
  for (const [chave, valor] of Object.entries(query)) {
    if (valor !== undefined) destino.searchParams.append(chave, String(valor));
  }
  return destino.toString();
}
