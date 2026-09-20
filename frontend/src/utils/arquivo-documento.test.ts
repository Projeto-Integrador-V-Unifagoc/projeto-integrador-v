import { describe, expect, it } from "vitest";

import { EXTENSOES_ACEITAS, validarDocumento } from "./arquivo-documento";

const EXECUTAVEL = new Uint8Array([
    0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
    0x54, 0x68, 0x69, 0x73, 0x20, 0x70, 0x72, 0x6f, 0x67, 0x72, 0x61, 0x6d,
]);

const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer\n%%EOF\n");

const PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
]);

const JPG = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

const ZIP = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

function arquivo(nome: string, conteudo: Uint8Array): File {
    return new File([conteudo], nome);
}

describe("validarDocumento", () => {
    it("aceita PDF, PNG, JPG e ZIP de verdade", async () => {
        expect(await validarDocumento(arquivo("historico.pdf", PDF))).toBeNull();
        expect(await validarDocumento(arquivo("rg.png", PNG))).toBeNull();
        expect(await validarDocumento(arquivo("rg.jpg", JPG))).toBeNull();
        expect(await validarDocumento(arquivo("documentos.zip", ZIP))).toBeNull();
    });

    it("recusa executavel com a propria extensao", async () => {
        const problema = await validarDocumento(arquivo("virus.exe", EXECUTAVEL));
        expect(problema).toMatch(/não é um formato aceito/i);
    });

    it("recusa executavel renomeado para pdf", async () => {
        const problema = await validarDocumento(arquivo("curriculo.pdf", EXECUTAVEL));
        expect(problema).toMatch(/não é um PDF de verdade/i);
        expect(problema).toMatch(/Trocar a extensão/i);
    });

    it("recusa executavel renomeado para png", async () => {
        expect(await validarDocumento(arquivo("foto.png", EXECUTAVEL))).toMatch(/não é um PNG de verdade/i);
    });

    it("recusa executavel renomeado para zip", async () => {
        expect(await validarDocumento(arquivo("pacote.zip", EXECUTAVEL))).toMatch(/não é um ZIP de verdade/i);
    });

    it("recusa arquivo com conteudo trocado entre formatos aceitos", async () => {
        expect(await validarDocumento(arquivo("rg.png", PDF))).toMatch(/não é um PNG de verdade/i);
        expect(await validarDocumento(arquivo("historico.pdf", PNG))).toMatch(/não é um PDF de verdade/i);
    });

    it("recusa outras extensoes perigosas", async () => {
        for (const nome of ["script.bat", "macro.js", "instalador.msi", "atalho.lnk", "planilha.xlsm"]) {
            expect(await validarDocumento(arquivo(nome, EXECUTAVEL))).toMatch(/não é um formato aceito/i);
        }
    });

    it("recusa arquivo vazio", async () => {
        expect(await validarDocumento(arquivo("vazio.pdf", new Uint8Array([])))).toMatch(/vazio ou corrompido/i);
    });

    it("recusa arquivo acima de 10 MB", async () => {
        const grande = new File([new Uint8Array(11 * 1024 * 1024)], "grande.pdf");
        expect(await validarDocumento(grande)).toMatch(/passa de 10 MB/i);
    });

    it("nao aceita extensao fora da lista publicada", async () => {
        expect(EXTENSOES_ACEITAS).not.toContain(".exe");
        expect(EXTENSOES_ACEITAS).toEqual([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".zip"]);
    });
});
