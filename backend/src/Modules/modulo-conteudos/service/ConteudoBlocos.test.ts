import { describe, expect, it } from "vitest";
import { avaliarLimitesDaPagina, calcularMinutos, idDoArquivo, urlDeVideoPermitida, validarEMedirBlocos } from "./ConteudoBlocos";

const ARQUIVO = "11111111-1111-4111-8111-111111111111";

const paragrafo = (texto: string, styles: Record<string, unknown> = {}) => ({
  type: "paragraph",
  props: { textAlignment: "left" },
  content: [{ type: "text", text: texto, styles }],
  children: [],
});

describe("validarEMedirBlocos", () => {
  it("conta palavras de texto, links e legendas e as mídias com URL", () => {
    const { metricas, arquivoIds } = validarEMedirBlocos([
      paragrafo("um dois três", { bold: true, textColor: "red" }),
      {
        type: "bulletListItem",
        content: [{ type: "link", href: "https://exemplo.com", content: [{ type: "text", text: "quatro cinco", styles: {} }] }],
        children: [paragrafo("seis")],
      },
      { type: "image", props: { url: `conteudo-arquivo:${ARQUIVO}`, caption: "sete oito" } },
      { type: "file", props: { url: `conteudo-arquivo:${ARQUIVO}` } },
      { type: "videoEmbed", props: { url: "https://www.youtube.com/watch?v=abc" } },
      { type: "linkCard", props: { url: "https://exemplo.com", titulo: "nove" } },
      { type: "image", props: { url: "" } },
      { type: "divider" },
    ]);
    expect(metricas).toMatchObject({ palavras: 9, imagens: 1, arquivos: 1, videos: 1, links: 1 });
    expect(arquivoIds).toEqual([ARQUIVO]);
  });

  it("calcula o tempo pela fórmula combinada", () => {
    // 400 palavras = 2 min; 5 imagens = 60 s; 1 vídeo = 60 s; 1 arquivo + 1 link = 10 s.
    expect(calcularMinutos({ palavras: 400, imagens: 5, videos: 1, arquivos: 1, links: 1 })).toBe(4.17);
  });

  it("recusa tipo de bloco fora da lista", () => {
    expect(() => validarEMedirBlocos([{ type: "table", content: [] }])).toThrow(/não é permitido/);
    expect(() => validarEMedirBlocos([{ type: "audio", props: {} }])).toThrow(/não é permitido/);
  });

  it("recusa estrutura que não é lista e props não primitivas", () => {
    expect(() => validarEMedirBlocos({})).toThrow(/lista de blocos/);
    expect(() => validarEMedirBlocos([{ type: "paragraph", props: { x: { y: 1 } } }])).toThrow(/Propriedade/);
  });

  it("recusa estilo desconhecido e cor inválida", () => {
    expect(() => validarEMedirBlocos([paragrafo("a", { fontSize: "10px" })])).toThrow(/não é permitida/);
    expect(() => validarEMedirBlocos([paragrafo("a", { textColor: "url(javascript:x)" })])).toThrow(/Cor inválida/);
  });

  it("recusa link inline que não seja http/https", () => {
    const bloco = {
      type: "paragraph",
      content: [{ type: "link", href: "javascript:alert(1)", content: [{ type: "text", text: "x", styles: {} }] }],
    };
    expect(() => validarEMedirBlocos([bloco])).toThrow(/Link inválido/);
  });

  it("recusa imagem com URL externa e vídeo de domínio não permitido", () => {
    expect(() => validarEMedirBlocos([{ type: "image", props: { url: "https://x.com/a.png" } }])).toThrow(/Arquivo inválido/);
    expect(() => validarEMedirBlocos([{ type: "videoEmbed", props: { url: "https://evil.com/v" } }])).toThrow(/YouTube/);
  });

  it("recusa texto em bloco que não aceita texto", () => {
    expect(() => validarEMedirBlocos([{ type: "divider", content: [{ type: "text", text: "x", styles: {} }] }])).toThrow(/não aceita texto/);
  });
});

describe("auxiliares", () => {
  it("aceita só vídeos https dos domínios permitidos", () => {
    expect(urlDeVideoPermitida("https://youtu.be/abc")).toBe(true);
    expect(urlDeVideoPermitida("https://player.vimeo.com/video/1")).toBe(true);
    expect(urlDeVideoPermitida("https://drive.google.com/file/d/x/view")).toBe(true);
    expect(urlDeVideoPermitida("http://youtube.com/watch?v=1")).toBe(false);
    expect(urlDeVideoPermitida("https://youtube.com.evil.com/x")).toBe(false);
  });

  it("extrai o id do arquivo só no formato interno", () => {
    expect(idDoArquivo(`conteudo-arquivo:${ARQUIVO}`)).toBe(ARQUIVO);
    expect(idDoArquivo("conteudo-arquivo:../../etc")).toBeNull();
  });

  it("separa aviso e bloqueio de tamanho", () => {
    const base = { palavras: 0, imagens: 0, videos: 0, arquivos: 0, links: 0 };
    expect(avaliarLimitesDaPagina({ ...base, minutosEstimados: 12 })).toEqual({
      bloqueios: [],
      avisos: ["Página extensa. Considere dividir o conteúdo em outra página."],
    });
    const excesso = avaliarLimitesDaPagina({ ...base, videos: 4, imagens: 16, minutosEstimados: 21 });
    expect(excesso.bloqueios).toHaveLength(3);
  });
});
