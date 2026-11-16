// Mesmos formatos e tamanhos aceitos pelo servidor (backend/src/Modules/routes/conteudoRoutes.ts).
export const FORMATOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const EXTENSOES_ARQUIVO = [".pdf", ".docx", ".pptx"];
export const LIMITE_IMAGEM = 8 * 1024 * 1024;
export const LIMITE_ARQUIVO = 10 * 1024 * 1024;

/** Confere formato e tamanho antes do envio; devolve a mensagem de erro ou null. */
export function validarArquivoParaEnvio(arquivo: File, tipo: "imagem" | "arquivo"): string | null {
    const ehImagem = FORMATOS_IMAGEM.includes(arquivo.type);
    if (tipo === "imagem" && !ehImagem) return "Envie imagens JPG, PNG, WEBP ou GIF.";
    if (!ehImagem && !EXTENSOES_ARQUIVO.some((ext) => arquivo.name.toLowerCase().endsWith(ext))) {
        return "Envie arquivos PDF, DOCX ou PPTX.";
    }
    if (arquivo.size > (ehImagem ? LIMITE_IMAGEM : LIMITE_ARQUIVO)) {
        return ehImagem ? "A imagem passa de 8 MB." : "O arquivo passa de 10 MB.";
    }
    return null;
}
