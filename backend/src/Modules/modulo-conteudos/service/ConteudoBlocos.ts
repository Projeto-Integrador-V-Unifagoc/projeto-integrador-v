import { erroConteudo } from "../errors/ConteudoError";
import { LIMITES_CONTEUDO } from "./conteudoLimites";

/**
 * Validação e métricas do documento salvo pelo editor de blocos (BlockNote).
 *
 * O documento é JSON estruturado — nunca HTML livre —, então o que chega ao
 * aluno é sempre renderizado pelo próprio editor. Mesmo assim o servidor só
 * aceita os tipos de bloco, estilos e URLs que a tela oferece, para que um
 * cliente adulterado não grave nada além disso.
 */

export const PREFIXO_ARQUIVO = "conteudo-arquivo:";

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Blocos com texto (inline) e blocos sem texto ("none").
const BLOCOS_COM_TEXTO = new Set([
  "paragraph",
  "heading",
  "quote",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "codeBlock",
]);
const BLOCOS_SEM_TEXTO = new Set(["divider", "image", "file", "videoEmbed", "linkCard"]);

const ESTILOS_BOOLEANOS = new Set(["bold", "italic", "underline", "strike", "code"]);
const ESTILOS_DE_COR = new Set(["textColor", "backgroundColor"]);
const COR = /^[a-z]{1,20}$/;

const DOMINIOS_DE_VIDEO = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "vimeo.com",
  "drive.google.com",
];

const TAMANHO_MAXIMO_PROP = 2000;

export interface MetricasPagina {
  palavras: number;
  imagens: number;
  videos: number;
  arquivos: number;
  links: number;
  minutosEstimados: number;
}

export interface ResultadoBlocos {
  blocos: unknown[];
  metricas: MetricasPagina;
  arquivoIds: string[];
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function urlHttp(valor: string) {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function urlDeVideoPermitida(valor: string) {
  const url = urlHttp(valor);
  if (!url || url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return DOMINIOS_DE_VIDEO.some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
}

export function idDoArquivo(url: string) {
  if (!url.startsWith(PREFIXO_ARQUIVO)) return null;
  const id = url.slice(PREFIXO_ARQUIVO.length);
  return UUID.test(id) ? id : null;
}

function contarPalavras(texto: string) {
  const limpo = texto.trim();
  return limpo ? limpo.split(/\s+/).length : 0;
}

export function calcularMinutos(m: Omit<MetricasPagina, "minutosEstimados">) {
  const segundos =
    (m.palavras / LIMITES_CONTEUDO.palavrasPorMinuto) * 60 +
    m.imagens * LIMITES_CONTEUDO.segundosPorImagem +
    m.videos * LIMITES_CONTEUDO.segundosPorVideo +
    m.arquivos * LIMITES_CONTEUDO.segundosPorArquivo +
    m.links * LIMITES_CONTEUDO.segundosPorLink;
  return Number((segundos / 60).toFixed(2));
}

function validarTextoComEstilo(item: Record<string, unknown>, caminho: string) {
  if (item.type !== "text" || typeof item.text !== "string") {
    throw erroConteudo.invalido(`Trecho de texto inválido em ${caminho}.`);
  }
  const estilos = item.styles ?? {};
  if (!ehObjeto(estilos)) throw erroConteudo.invalido(`Formatação inválida em ${caminho}.`);
  for (const [chave, valor] of Object.entries(estilos)) {
    if (ESTILOS_BOOLEANOS.has(chave)) {
      if (valor !== true) throw erroConteudo.invalido(`Formatação inválida em ${caminho}.`);
    } else if (ESTILOS_DE_COR.has(chave)) {
      if (typeof valor !== "string" || !COR.test(valor)) throw erroConteudo.invalido(`Cor inválida em ${caminho}.`);
    } else {
      throw erroConteudo.invalido(`Formatação "${chave}" não é permitida.`);
    }
  }
  return item.text;
}

// Devolve o texto do bloco (para contar palavras).
function validarConteudoEmLinha(conteudo: unknown, caminho: string): string {
  if (conteudo === undefined) return "";
  if (!Array.isArray(conteudo)) throw erroConteudo.invalido(`Conteúdo inválido em ${caminho}.`);
  const partes: string[] = [];
  for (const item of conteudo) {
    if (!ehObjeto(item)) throw erroConteudo.invalido(`Conteúdo inválido em ${caminho}.`);
    if (item.type === "link") {
      if (typeof item.href !== "string" || !urlHttp(item.href)) {
        throw erroConteudo.invalido(`Link inválido em ${caminho}: use um endereço http ou https.`);
      }
      if (!Array.isArray(item.content)) throw erroConteudo.invalido(`Link inválido em ${caminho}.`);
      for (const trecho of item.content) {
        if (!ehObjeto(trecho)) throw erroConteudo.invalido(`Link inválido em ${caminho}.`);
        partes.push(validarTextoComEstilo(trecho, caminho));
      }
    } else {
      partes.push(validarTextoComEstilo(item, caminho));
    }
  }
  return partes.join("");
}

function validarProps(props: unknown, caminho: string) {
  if (props === undefined) return {};
  if (!ehObjeto(props)) throw erroConteudo.invalido(`Propriedades inválidas em ${caminho}.`);
  for (const [chave, valor] of Object.entries(props)) {
    const tipo = typeof valor;
    if (tipo !== "string" && tipo !== "number" && tipo !== "boolean") {
      throw erroConteudo.invalido(`Propriedade "${chave}" inválida em ${caminho}.`);
    }
    if (tipo === "string" && (valor as string).length > TAMANHO_MAXIMO_PROP) {
      throw erroConteudo.invalido(`Propriedade "${chave}" muito longa em ${caminho}.`);
    }
  }
  return props;
}

/**
 * Valida o documento e calcula as métricas. Lança 400 para qualquer estrutura
 * fora do que o editor produz. Não aplica os limites de tamanho (ver
 * `avaliarLimitesDaPagina`), para que o chamador decida entre aviso e bloqueio.
 */
export function validarEMedirBlocos(blocos: unknown): ResultadoBlocos {
  if (!Array.isArray(blocos)) throw erroConteudo.invalido("O conteúdo da página deve ser uma lista de blocos.");
  const bytes = Buffer.byteLength(JSON.stringify(blocos), "utf8");
  if (bytes > LIMITES_CONTEUDO.tamanhoMaximoDosBlocosBytes) {
    throw erroConteudo.limite("O conteúdo da página é grande demais para ser salvo. Divida-o em outra página.");
  }

  const contagem = { palavras: 0, imagens: 0, videos: 0, arquivos: 0, links: 0 };
  const arquivoIds = new Set<string>();

  const visitar = (lista: unknown[], profundidade: number, prefixo: string) => {
    if (profundidade > LIMITES_CONTEUDO.profundidadeMaximaDeBlocos) {
      throw erroConteudo.invalido("Há blocos aninhados em excesso.");
    }
    lista.forEach((bloco, indice) => {
      const caminho = `${prefixo}${indice + 1}`;
      if (!ehObjeto(bloco) || typeof bloco.type !== "string") {
        throw erroConteudo.invalido(`Bloco ${caminho} inválido.`);
      }
      const tipo = bloco.type;
      if (!BLOCOS_COM_TEXTO.has(tipo) && !BLOCOS_SEM_TEXTO.has(tipo)) {
        throw erroConteudo.invalido(`O tipo de bloco "${tipo}" não é permitido.`);
      }
      const props = validarProps(bloco.props, caminho) as Record<string, unknown>;

      if (BLOCOS_COM_TEXTO.has(tipo)) {
        contagem.palavras += contarPalavras(validarConteudoEmLinha(bloco.content, caminho));
      } else if (bloco.content !== undefined && !(Array.isArray(bloco.content) && bloco.content.length === 0)) {
        throw erroConteudo.invalido(`O bloco ${caminho} não aceita texto.`);
      }

      const url = typeof props.url === "string" ? props.url.trim() : "";
      if (tipo === "image" || tipo === "file") {
        if (url) {
          const id = idDoArquivo(url);
          if (!id) throw erroConteudo.invalido(`Arquivo inválido no bloco ${caminho}. Envie o arquivo pelo editor.`);
          arquivoIds.add(id);
          if (tipo === "image") contagem.imagens += 1;
          else contagem.arquivos += 1;
        }
        if (typeof props.caption === "string") contagem.palavras += contarPalavras(props.caption);
      } else if (tipo === "videoEmbed") {
        if (url) {
          if (!urlDeVideoPermitida(url)) {
            throw erroConteudo.invalido("Vídeo inválido: use um link do YouTube, Vimeo ou Google Drive.");
          }
          contagem.videos += 1;
        }
      } else if (tipo === "linkCard") {
        if (url) {
          if (!urlHttp(url)) throw erroConteudo.invalido(`Link inválido no bloco ${caminho}: use http ou https.`);
          contagem.links += 1;
        }
        if (typeof props.titulo === "string") contagem.palavras += contarPalavras(props.titulo);
      }

      if (bloco.children !== undefined) {
        if (!Array.isArray(bloco.children)) throw erroConteudo.invalido(`Bloco ${caminho} inválido.`);
        visitar(bloco.children, profundidade + 1, `${caminho}.`);
      }
    });
  };

  visitar(blocos, 1, "");
  return {
    blocos,
    metricas: { ...contagem, minutosEstimados: calcularMinutos(contagem) },
    arquivoIds: [...arquivoIds],
  };
}

// Bloqueios impedem salvar (422); avisos voltam na resposta para a tela.
export function avaliarLimitesDaPagina(metricas: MetricasPagina) {
  const bloqueios: string[] = [];
  const avisos: string[] = [];
  if (metricas.minutosEstimados > LIMITES_CONTEUDO.paginaMinutosMaximo) {
    bloqueios.push(`A página passou de ${LIMITES_CONTEUDO.paginaMinutosMaximo} minutos estimados de leitura.`);
  } else if (metricas.minutosEstimados > LIMITES_CONTEUDO.paginaMinutosRecomendado) {
    avisos.push("Página extensa. Considere dividir o conteúdo em outra página.");
  }
  if (metricas.videos > LIMITES_CONTEUDO.paginaMaxVideos) {
    bloqueios.push(`Use no máximo ${LIMITES_CONTEUDO.paginaMaxVideos} vídeos por página.`);
  }
  if (metricas.imagens > LIMITES_CONTEUDO.paginaMaxImagens) {
    bloqueios.push(`Use no máximo ${LIMITES_CONTEUDO.paginaMaxImagens} imagens por página.`);
  }
  return { bloqueios, avisos };
}
