import { describe, expect, it } from "vitest";
import { validarArquivoParaEnvio } from "./arquivo-envio";

const arquivo = (nome: string, tipo: string, bytes = 10) => {
    const f = new File(["x"], nome, { type: tipo });
    Object.defineProperty(f, "size", { value: bytes });
    return f;
};

describe("validarArquivoParaEnvio", () => {
    it("aceita imagens suportadas até 8 MB", () => {
        expect(validarArquivoParaEnvio(arquivo("a.png", "image/png"), "imagem")).toBeNull();
        expect(validarArquivoParaEnvio(arquivo("a.png", "image/png", 9 * 1024 * 1024), "imagem")).toBe("A imagem passa de 8 MB.");
    });

    it("recusa formato de imagem não suportado", () => {
        expect(validarArquivoParaEnvio(arquivo("a.svg", "image/svg+xml"), "imagem")).toBe("Envie imagens JPG, PNG, WEBP ou GIF.");
    });

    it("aceita PDF, DOCX e PPTX até 10 MB como anexo", () => {
        expect(validarArquivoParaEnvio(arquivo("apostila.pdf", "application/pdf"), "arquivo")).toBeNull();
        expect(validarArquivoParaEnvio(arquivo("aula.PPTX", ""), "arquivo")).toBeNull();
        expect(validarArquivoParaEnvio(arquivo("lista.docx", "", 11 * 1024 * 1024), "arquivo")).toBe("O arquivo passa de 10 MB.");
    });

    it("recusa outros formatos de anexo", () => {
        expect(validarArquivoParaEnvio(arquivo("dados.zip", "application/zip"), "arquivo")).toBe("Envie arquivos PDF, DOCX ou PPTX.");
        expect(validarArquivoParaEnvio(arquivo("planilha.xlsx", ""), "arquivo")).toBe("Envie arquivos PDF, DOCX ou PPTX.");
    });
});
