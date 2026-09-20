export const EXTENSOES_ACEITAS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".zip"];

export const ACCEPT_DOCUMENTOS = EXTENSOES_ACEITAS.join(",");

export const TAMANHO_MAXIMO_MB = 10;

export const TEXTO_FORMATOS = "PDF, imagem (JPG, PNG, WEBP, GIF) ou ZIP, até 10 MB cada";

const ASSINATURAS: Array<{ extensoes: string[]; nome: string; bytes: number[][]; extra?: (b: Uint8Array) => boolean }> = [
    { extensoes: [".pdf"], nome: "PDF", bytes: [[0x25, 0x50, 0x44, 0x46]] },
    { extensoes: [".png"], nome: "PNG", bytes: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
    { extensoes: [".jpg", ".jpeg"], nome: "JPG", bytes: [[0xff, 0xd8, 0xff]] },
    { extensoes: [".gif"], nome: "GIF", bytes: [[0x47, 0x49, 0x46, 0x38]] },
    {
        extensoes: [".webp"],
        nome: "WEBP",
        bytes: [[0x52, 0x49, 0x46, 0x46]],
        extra: (b) => String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP",
    },
    {
        extensoes: [".zip"],
        nome: "ZIP",
        bytes: [
            [0x50, 0x4b, 0x03, 0x04],
            [0x50, 0x4b, 0x05, 0x06],
            [0x50, 0x4b, 0x07, 0x08],
        ],
    },
];

function extensaoDe(nome: string): string {
    const ponto = nome.lastIndexOf(".");
    return ponto === -1 ? "" : nome.slice(ponto).toLowerCase();
}

async function lerCabecalho(arquivo: File): Promise<Uint8Array> {
    const pedaco = arquivo.slice(0, 32);
    return new Uint8Array(await pedaco.arrayBuffer());
}

export async function validarDocumento(arquivo: File): Promise<string | null> {
    const extensao = extensaoDe(arquivo.name);

    if (!EXTENSOES_ACEITAS.includes(extensao)) {
        return `"${arquivo.name}" não é um formato aceito. Envie ${TEXTO_FORMATOS}.`;
    }

    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
        return `"${arquivo.name}" passa de ${TAMANHO_MAXIMO_MB} MB. Envie uma versão menor.`;
    }

    if (arquivo.size < 16) {
        return `"${arquivo.name}" está vazio ou corrompido.`;
    }

    const formato = ASSINATURAS.find((a) => a.extensoes.includes(extensao));
    if (!formato) return null;

    let cabecalho: Uint8Array;

    try {
        cabecalho = await lerCabecalho(arquivo);
    } catch {
        return null;
    }

    const bate = formato.bytes.some((assinatura) => assinatura.every((byte, i) => cabecalho[i] === byte));
    const conferido = bate && (formato.extra ? formato.extra(cabecalho) : true);

    if (!conferido) {
        return `"${arquivo.name}" não é um ${formato.nome} de verdade. Trocar a extensão do arquivo não muda o tipo dele.`;
    }

    return null;
}
