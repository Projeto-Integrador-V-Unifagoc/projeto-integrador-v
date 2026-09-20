import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "vitest";

import {
    conferirConteudoDoArquivo,
    extensaoAceita,
    mimeAceito,
    tratarErroDeUpload,
    MENSAGEM_FORMATOS,
} from "./ValidacaoArquivo";

const EXECUTAVEL = Buffer.from(
    "4d5a90000300000004000000ffff0000546869732070726f6772616d2063616e6e6f742062652072756e",
    "hex",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer\n%%EOF\n");
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000", "hex");
const JPG = Buffer.from("ffd8ffe000104a46494600010100000100010000ffd9", "hex");
const ZIP = Buffer.from("504b0506000000000000000000000000000000000000", "hex");

const criados: string[] = [];

function arquivoTemporario(nome: string, conteudo: Buffer): string {
    const destino = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "doc-")), nome);
    fs.writeFileSync(destino, conteudo);
    criados.push(destino);
    return destino;
}

afterEach(() => {
    while (criados.length > 0) {
        const alvo = criados.pop()!;
        try {
            fs.rmSync(path.dirname(alvo), { recursive: true, force: true });
        } catch {
            continue;
        }
    }
});

describe("ValidacaoArquivo — formatos aceitos", () => {
    it("aceita os formatos publicados", () => {
        for (const [nome, conteudo] of [
            ["historico.pdf", PDF],
            ["rg.png", PNG],
            ["rg.jpg", JPG],
            ["rg.jpeg", JPG],
            ["pacote.zip", ZIP],
        ] as Array<[string, Buffer]>) {
            const caminho = arquivoTemporario(nome, conteudo);
            assert.doesNotThrow(() => conferirConteudoDoArquivo(caminho, nome));
            assert.equal(fs.existsSync(caminho), true, `${nome} deveria continuar no disco`);
        }
    });
});

describe("ValidacaoArquivo — bloqueio de executavel", () => {
    it("recusa executavel renomeado para pdf e apaga o arquivo", () => {
        const caminho = arquivoTemporario("curriculo.pdf", EXECUTAVEL);

        assert.throws(() => conferirConteudoDoArquivo(caminho, "curriculo.pdf"), /não corresponde a um PDF válido/);
        assert.equal(fs.existsSync(caminho), false, "o arquivo recusado tem que sair do disco");
    });

    it("recusa executavel renomeado para png", () => {
        const caminho = arquivoTemporario("foto.png", EXECUTAVEL);
        assert.throws(() => conferirConteudoDoArquivo(caminho, "foto.png"), /não corresponde a um PNG válido/);
    });

    it("recusa executavel renomeado para zip", () => {
        const caminho = arquivoTemporario("docs.zip", EXECUTAVEL);
        assert.throws(() => conferirConteudoDoArquivo(caminho, "docs.zip"), /não corresponde a um ZIP válido/);
    });

    it("recusa extensao fora da lista", () => {
        const caminho = arquivoTemporario("virus.exe", EXECUTAVEL);
        assert.throws(
            () => conferirConteudoDoArquivo(caminho, "virus.exe"),
            (erro: Error) => erro.message === MENSAGEM_FORMATOS,
        );
        assert.equal(fs.existsSync(caminho), false);
    });

    it("recusa conteudo trocado entre formatos aceitos", () => {
        const caminho = arquivoTemporario("rg.png", PDF);
        assert.throws(() => conferirConteudoDoArquivo(caminho, "rg.png"), /não corresponde a um PNG válido/);
    });

    it("recusa arquivo vazio", () => {
        const caminho = arquivoTemporario("vazio.pdf", Buffer.alloc(0));
        assert.throws(() => conferirConteudoDoArquivo(caminho, "vazio.pdf"), /vazio ou corrompido/);
    });
});

describe("ValidacaoArquivo — filtro de entrada", () => {
    it("reconhece extensoes aceitas e recusa as demais", () => {
        for (const nome of ["a.pdf", "a.PNG", "a.Jpeg", "a.zip", "a.webp", "a.gif"]) {
            assert.equal(extensaoAceita(nome), true, nome);
        }

        for (const nome of ["a.exe", "a.bat", "a.js", "a.msi", "a.sh", "a.lnk", "a"]) {
            assert.equal(extensaoAceita(nome), false, nome);
        }
    });

    it("reconhece mimes aceitos e recusa os demais", () => {
        assert.equal(mimeAceito("application/pdf"), true);
        assert.equal(mimeAceito("image/png"), true);
        assert.equal(mimeAceito("application/zip"), true);
        assert.equal(mimeAceito("application/x-msdownload"), false);
        assert.equal(mimeAceito("text/html"), false);
    });
});

describe("ValidacaoArquivo — erros de upload", () => {
    it("traduz arquivo grande demais", () => {
        const tratado = tratarErroDeUpload({ code: "LIMIT_FILE_SIZE" });
        assert.equal(tratado?.status, 400);
        assert.match(tratado!.mensagem, /10 MB/);
    });

    it("traduz formato recusado pelo filtro", () => {
        const tratado = tratarErroDeUpload(new Error(MENSAGEM_FORMATOS));
        assert.equal(tratado?.status, 400);
        assert.equal(tratado?.mensagem, MENSAGEM_FORMATOS);
    });

    it("devolve nulo quando nao houve erro", () => {
        assert.equal(tratarErroDeUpload(undefined), null);
    });
});
