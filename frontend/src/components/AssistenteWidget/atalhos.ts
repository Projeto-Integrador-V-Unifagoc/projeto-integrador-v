import { ehRotaInterna } from "./rotaInterna";

export interface Atalho {
    rotulo: string;
    rota: string;
}

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;
const LINKS = new RegExp(LINK.source, "g");

/** "Minhas Notas" quando o nome aparece dentro de uma frase. */
export const nomeDaTela = (rotulo: string) => rotulo.replace(/^abrir\s+(a\s+tela\s+)?/i, "").trim();

/** "Abrir Minhas Notas" no botão, venha o rótulo com ou sem o verbo. */
const rotuloDoBotao = (rotulo: string) => `Abrir ${nomeDaTela(rotulo)}`;

/** Linha que, tirando os links, não tem conteúdo (só espaço, pontuação ou "e"). */
const soTemLinks = (linha: string) => LINK.test(linha) && linha.replace(LINKS, "").replace(/[\s.,;:|•·\-–—e]/gi, "") === "";

/**
 * Separa os links de tela do texto da resposta: cada tela vira um atalho (botão) e as linhas que só tinham
 * link saem do corpo. Links externos não viram atalho.
 */
export function separarAtalhos(texto: string): { corpo: string; atalhos: Atalho[] } {
    const atalhos = new Map<string, Atalho>();
    for (const [, rotulo, rota] of texto.matchAll(LINKS)) {
        if (ehRotaInterna(rota) && !atalhos.has(rota)) atalhos.set(rota, { rotulo: rotuloDoBotao(rotulo), rota });
    }
    const corpo = texto
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter((linha) => !soTemLinks(linha.trim().replace(/^[-*•]\s+/, "")))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    return { corpo, atalhos: [...atalhos.values()] };
}
