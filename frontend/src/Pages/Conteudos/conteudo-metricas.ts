import type { LimitesConteudo, MetricasPagina } from "../../models/conteudo-model";

/**
 * Mesma contagem do servidor (backend/.../ConteudoBlocos.ts): palavras do texto,
 * de links, legendas e títulos de link; mídias só contam com URL preenchida.
 * O servidor recalcula ao salvar — aqui serve para a barra em tempo real.
 */

type Bloco = {
    type?: string;
    props?: Record<string, unknown>;
    content?: unknown;
    children?: unknown;
};

const BLOCOS_COM_TEXTO = new Set([
    "paragraph",
    "heading",
    "quote",
    "bulletListItem",
    "numberedListItem",
    "checkListItem",
    "codeBlock",
]);

function contarPalavras(texto: string) {
    const limpo = texto.trim();
    return limpo ? limpo.split(/\s+/).length : 0;
}

function textoEmLinha(conteudo: unknown): string {
    if (!Array.isArray(conteudo)) return "";
    return conteudo
        .map((item: { type?: string; text?: string; content?: unknown }) => {
            if (item?.type === "link") return textoEmLinha(item.content);
            return typeof item?.text === "string" ? item.text : "";
        })
        .join("");
}

export function calcularMinutos(m: Omit<MetricasPagina, "minutosEstimados">, tempo: LimitesConteudo["tempo"]) {
    const segundos =
        (m.palavras / tempo.palavrasPorMinuto) * 60 +
        m.imagens * tempo.segundosPorImagem +
        m.videos * tempo.segundosPorVideo +
        m.arquivos * tempo.segundosPorArquivo +
        m.links * tempo.segundosPorLink;
    return Number((segundos / 60).toFixed(2));
}

export function calcularMetricas(blocos: unknown[], tempo: LimitesConteudo["tempo"]): MetricasPagina {
    const contagem = { palavras: 0, imagens: 0, videos: 0, arquivos: 0, links: 0 };
    const visitar = (lista: unknown) => {
        if (!Array.isArray(lista)) return;
        for (const bloco of lista as Bloco[]) {
            const tipo = bloco?.type ?? "";
            const props = bloco?.props ?? {};
            const url = typeof props.url === "string" ? props.url.trim() : "";
            if (BLOCOS_COM_TEXTO.has(tipo)) contagem.palavras += contarPalavras(textoEmLinha(bloco.content));
            if (tipo === "image" || tipo === "file") {
                if (url) contagem[tipo === "image" ? "imagens" : "arquivos"] += 1;
                if (typeof props.caption === "string") contagem.palavras += contarPalavras(props.caption);
            }
            if (tipo === "videoEmbed" && url) contagem.videos += 1;
            if (tipo === "linkCard") {
                if (url) contagem.links += 1;
                if (typeof props.titulo === "string") contagem.palavras += contarPalavras(props.titulo);
            }
            visitar(bloco?.children);
        }
    };
    visitar(blocos);
    return { ...contagem, minutosEstimados: calcularMinutos(contagem, tempo) };
}

export type EstadoTamanho = "ok" | "aviso" | "bloqueio";

export function avaliarTamanho(m: MetricasPagina, pagina: LimitesConteudo["pagina"]) {
    let estado: EstadoTamanho = "ok";
    let mensagem = "Tamanho ideal";
    if (m.minutosEstimados > pagina.minutosRecomendado) {
        estado = "aviso";
        mensagem = "Página extensa. Considere dividir o conteúdo.";
    }
    if (m.minutosEstimados >= pagina.minutosMaximo || m.videos >= pagina.maxVideos || m.imagens >= pagina.maxImagens) {
        estado = "bloqueio";
        mensagem = "Limite da página atingido. Crie uma nova página para continuar.";
    }
    const percentual = Math.min(100, Math.round((m.minutosEstimados / pagina.minutosMaximo) * 100));
    return { estado, mensagem, percentual };
}

export function formatarMinutos(minutos: number) {
    if (minutos < 1) return "menos de 1 min";
    return `~${Math.round(minutos)} min`;
}
