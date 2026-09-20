import fs from "fs";
import path from "path";

export interface FormatoPermitido {
    extensoes: string[];
    mimes: string[];
    assinaturas: Array<{ deslocamento: number; bytes: number[] }>;
    verificacaoExtra?: (cabecalho: Buffer) => boolean;
}

export const FORMATOS_ACEITOS: Record<string, FormatoPermitido> = {
    pdf: {
        extensoes: [".pdf"],
        mimes: ["application/pdf"],
        assinaturas: [{ deslocamento: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
    },
    png: {
        extensoes: [".png"],
        mimes: ["image/png"],
        assinaturas: [{ deslocamento: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
    },
    jpeg: {
        extensoes: [".jpg", ".jpeg"],
        mimes: ["image/jpeg", "image/jpg"],
        assinaturas: [{ deslocamento: 0, bytes: [0xff, 0xd8, 0xff] }],
    },
    webp: {
        extensoes: [".webp"],
        mimes: ["image/webp"],
        assinaturas: [{ deslocamento: 0, bytes: [0x52, 0x49, 0x46, 0x46] }],
        verificacaoExtra: (cabecalho) => cabecalho.subarray(8, 12).toString("ascii") === "WEBP",
    },
    gif: {
        extensoes: [".gif"],
        mimes: ["image/gif"],
        assinaturas: [{ deslocamento: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
    },
    zip: {
        extensoes: [".zip"],
        mimes: ["application/zip", "application/x-zip-compressed", "multipart/x-zip"],
        assinaturas: [
            { deslocamento: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
            { deslocamento: 0, bytes: [0x50, 0x4b, 0x05, 0x06] },
            { deslocamento: 0, bytes: [0x50, 0x4b, 0x07, 0x08] },
        ],
    },
};

export const EXTENSOES_ACEITAS = Object.values(FORMATOS_ACEITOS).flatMap((f) => f.extensoes);

export const MENSAGEM_FORMATOS = "Envie apenas PDF, imagem (JPG, PNG, WEBP, GIF) ou ZIP.";

const TAMANHO_MINIMO = 16;

function casaAssinatura(cabecalho: Buffer, formato: FormatoPermitido): boolean {
    const bateAlgumaAssinatura = formato.assinaturas.some(({ deslocamento, bytes }) =>
        bytes.every((byte, i) => cabecalho[deslocamento + i] === byte),
    );

    if (!bateAlgumaAssinatura) return false;

    return formato.verificacaoExtra ? formato.verificacaoExtra(cabecalho) : true;
}

export function extensaoAceita(nomeArquivo: string): boolean {
    return EXTENSOES_ACEITAS.includes(path.extname(nomeArquivo).toLowerCase());
}

export function mimeAceito(mime: string): boolean {
    const informado = String(mime ?? "").toLowerCase();
    return Object.values(FORMATOS_ACEITOS).some((f) => f.mimes.includes(informado));
}

function lerCabecalho(caminho: string, tamanho = 32): Buffer {
    const descritor = fs.openSync(caminho, "r");

    try {
        const buffer = Buffer.alloc(tamanho);
        const lidos = fs.readSync(descritor, buffer, 0, tamanho, 0);
        return buffer.subarray(0, lidos);
    } finally {
        fs.closeSync(descritor);
    }
}

export function descartarArquivo(caminho?: string): void {
    if (!caminho) return;

    try {
        if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
    } catch (erro) {
        console.error("[upload] não foi possível remover o arquivo:", erro);
    }
}

export function tratarErroDeUpload(erro: unknown): { status: number; mensagem: string } | null {
    if (!erro) return null;

    const codigo = String((erro as any)?.code ?? "");
    const texto = String((erro as any)?.message ?? erro);

    if (codigo === "LIMIT_FILE_SIZE") {
        return { status: 400, mensagem: "O arquivo passa de 10 MB. Envie uma versão menor." };
    }

    if (codigo.startsWith("LIMIT_")) {
        return { status: 400, mensagem: "Envio inválido. Mande um arquivo por vez." };
    }

    if (texto.includes(MENSAGEM_FORMATOS) || texto === MENSAGEM_FORMATOS) {
        return { status: 400, mensagem: MENSAGEM_FORMATOS };
    }

    return { status: 400, mensagem: texto || "Não foi possível receber o arquivo." };
}

export function conferirConteudoDoArquivo(caminho: string, nomeOriginal: string): void {
    const remover = () => {
        try {
            fs.unlinkSync(caminho);
        } catch (erro) {
            console.error("[upload] não foi possível remover o arquivo recusado:", erro);
        }
    };

    const extensao = path.extname(nomeOriginal).toLowerCase();
    const formato = Object.values(FORMATOS_ACEITOS).find((f) => f.extensoes.includes(extensao));

    if (!formato) {
        remover();
        throw new Error(MENSAGEM_FORMATOS);
    }

    let estatisticas: fs.Stats;

    try {
        estatisticas = fs.statSync(caminho);
    } catch {
        throw new Error("Não foi possível ler o arquivo enviado. Tente novamente.");
    }

    if (estatisticas.size < TAMANHO_MINIMO) {
        remover();
        throw new Error("O arquivo enviado está vazio ou corrompido.");
    }

    const cabecalho = lerCabecalho(caminho);

    if (!casaAssinatura(cabecalho, formato)) {
        remover();
        throw new Error(
            `O conteúdo do arquivo não corresponde a um ${extensao.replace(".", "").toUpperCase()} válido. ` +
                "Renomear a extensão não muda o tipo do arquivo.",
        );
    }
}
