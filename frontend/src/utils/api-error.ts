import axios from "axios";

export function mensagemErroApi(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  const data = error.response?.data as { mensagem?: unknown; error?: unknown; message?: unknown } | undefined;
  const mensagem = data?.mensagem ?? data?.error ?? data?.message;

  return typeof mensagem === "string" && mensagem.trim() ? mensagem : fallback;
}
