import { configurarAmbienteTeste } from "../../backend/src/config/ambienteTeste";

/** A ativação lembrada do backend não substitui autorização explícita da suíte. */
export function exigirModoSintetico(): void {
  if (process.env.ACADEMICO_MODO_TESTE !== "true") {
    throw new Error("A suíte sintética exige ACADEMICO_MODO_TESTE=true.");
  }
  configurarAmbienteTeste({ ...process.env,
    DATABASE_URL: process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL });
}

/** Não abre rede e não expõe a URL recebida em erros. */
export function validarUrlHttpTeste(valor: string): string {
  exigirModoSintetico();
  let url: URL;
  try { url = new URL(valor); } catch { throw new Error("Destino HTTP sintético inválido."); }
  if (!["http:", "https:"].includes(url.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || url.username || url.password || url.hash) {
    throw new Error("HTTP/browser sintético exige destino loopback sem credenciais ou fragmentos.");
  }
  return url.toString().replace(/\/$/, "");
}
