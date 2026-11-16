import { describe, expect, it } from "vitest";
import { avaliarTamanho, calcularMetricas, calcularMinutos } from "./conteudo-metricas";

const tempo = { palavrasPorMinuto: 200, segundosPorImagem: 12, segundosPorVideo: 60, segundosPorArquivo: 5, segundosPorLink: 5 };
const pagina = { minutosRecomendado: 10, minutosMaximo: 20, maxVideos: 3, maxImagens: 15 };
const ARQUIVO = "conteudo-arquivo:11111111-1111-4111-8111-111111111111";

describe("conteudo-metricas", () => {
    // Mesmo caso do teste do backend (ConteudoBlocos.test.ts): a fórmula precisa bater.
    it("conta como o servidor", () => {
        const metricas = calcularMetricas(
            [
                { type: "paragraph", content: [{ type: "text", text: "um dois três", styles: { bold: true } }], children: [] },
                {
                    type: "bulletListItem",
                    content: [{ type: "link", href: "https://x.com", content: [{ type: "text", text: "quatro cinco", styles: {} }] }],
                    children: [{ type: "paragraph", content: [{ type: "text", text: "seis", styles: {} }] }],
                },
                { type: "image", props: { url: ARQUIVO, caption: "sete oito" } },
                { type: "file", props: { url: ARQUIVO } },
                { type: "videoEmbed", props: { url: "https://www.youtube.com/watch?v=abc" } },
                { type: "linkCard", props: { url: "https://exemplo.com", titulo: "nove" } },
                { type: "image", props: { url: "" } },
            ],
            tempo,
        );
        expect(metricas).toMatchObject({ palavras: 9, imagens: 1, arquivos: 1, videos: 1, links: 1 });
        expect(calcularMinutos({ palavras: 400, imagens: 5, videos: 1, arquivos: 1, links: 1 }, tempo)).toBe(4.17);
    });

    it("classifica a barra em ok, aviso e bloqueio", () => {
        const base = { palavras: 0, imagens: 0, videos: 0, arquivos: 0, links: 0 };
        expect(avaliarTamanho({ ...base, minutosEstimados: 6 }, pagina)).toMatchObject({ estado: "ok", percentual: 30 });
        expect(avaliarTamanho({ ...base, minutosEstimados: 12 }, pagina).estado).toBe("aviso");
        expect(avaliarTamanho({ ...base, minutosEstimados: 20 }, pagina)).toMatchObject({ estado: "bloqueio", percentual: 100 });
        expect(avaliarTamanho({ ...base, videos: 3, minutosEstimados: 3 }, pagina).estado).toBe("bloqueio");
    });
});
