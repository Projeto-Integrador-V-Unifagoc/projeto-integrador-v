import path from "path";

// Pasta dos anexos do conteúdo. No Docker é /app/uploads-conteudo (volume do compose);
// no `npm run dev`, backend/uploads-conteudo.
export const UPLOAD_CONTEUDO_DIR = process.env.UPLOAD_CONTEUDO_DIR ?? path.resolve(process.cwd(), "uploads-conteudo");

/**
 * O banco guarda só o nome do arquivo em disco, para o mesmo registro funcionar
 * no backend local e no container (que compartilham o banco em desenvolvimento).
 * `win32.basename` aceita "/" e "\", então registros antigos com caminho absoluto
 * também são resolvidos.
 */
export function nomeEmDisco(caminho: string): string {
  return path.win32.basename(caminho);
}

export function caminhoCompleto(caminhoSalvo: string): string {
  return path.join(UPLOAD_CONTEUDO_DIR, nomeEmDisco(caminhoSalvo));
}
