import fs from "node:fs";
import path from "node:path";

/**
 * A base de conhecimento do assistente: políticas e artigos de ajuda em Markdown.
 * O que cada perfil enxerga sai do campo `perfis` do frontmatter de cada artigo,
 * não da pasta onde ele está: a pasta só organiza.
 */

export const PERFIS_ASSISTENTE = ["aluno", "professor", "secretaria"] as const;
export type PerfilAssistente = (typeof PERFIS_ASSISTENTE)[number];

export interface ArtigoDeAjuda {
    codigo: string;
    titulo: string;
    perfis: PerfilAssistente[];
    rota: string;
    tela: string;
    resumo: string;
    conteudo: string;
}

export interface BaseDeConhecimento {
    politicas: { comum: string } & Record<PerfilAssistente, string>;
    artigos: Record<PerfilAssistente, Map<string, ArtigoDeAjuda>>;
}

/** Mapeia o tipo_usuario do token para o perfil do assistente. Desconhecido não tem acesso. */
export function perfilDoUsuario(tipoUsuario: unknown): PerfilAssistente | null {
    const tipo = String(tipoUsuario ?? "").trim().toLowerCase();
    if (tipo === "secretaria" || tipo === "administrador") return "secretaria";
    if (tipo === "professor") return "professor";
    if (tipo === "aluno") return "aluno";
    return null;
}

const CAMPOS_OBRIGATORIOS = ["codigo", "titulo", "perfis", "rota", "tela", "resumo"] as const;

/** Frontmatter simples: `chave: valor` e listas `[a, b]`. É tudo o que os artigos usam. */
export function lerArtigo(texto: string, origem: string): ArtigoDeAjuda {
    const casamento = texto.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!casamento) throw new Error(`Artigo sem frontmatter: ${origem}`);

    const campos: Record<string, string | string[]> = {};
    for (const linha of casamento[1].split("\n")) {
        const par = linha.match(/^(\w+):\s*(.*)$/);
        if (!par) continue;
        const valor = par[2].trim();
        campos[par[1]] = valor.startsWith("[")
            ? valor.replace(/^\[|\]$/g, "").split(",").map((v) => v.trim()).filter(Boolean)
            : valor;
    }

    for (const campo of CAMPOS_OBRIGATORIOS) {
        if (!campos[campo] || campos[campo].length === 0) {
            throw new Error(`Artigo ${origem} sem o campo "${campo}".`);
        }
    }

    const perfis = campos.perfis as string[];
    for (const perfil of perfis) {
        if (!(PERFIS_ASSISTENTE as readonly string[]).includes(perfil)) {
            throw new Error(`Artigo ${origem} com perfil desconhecido: ${perfil}.`);
        }
    }

    const rota = String(campos.rota);
    if (!rota.startsWith("/")) throw new Error(`Artigo ${origem}: a rota deve ser interna (começar com /).`);

    return {
        codigo: String(campos.codigo).toLowerCase(),
        titulo: String(campos.titulo),
        perfis: perfis as PerfilAssistente[],
        rota,
        tela: String(campos.tela),
        resumo: String(campos.resumo),
        conteudo: casamento[2].trim(),
    };
}

function arquivosMd(pasta: string): string[] {
    return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
        const caminho = path.join(pasta, item.name);
        if (item.isDirectory()) return arquivosMd(caminho);
        return item.name.endsWith(".md") ? [caminho] : [];
    });
}

/** Em dev a pasta fica ao lado deste arquivo; no build (dist) os .md continuam só em src. */
export function pastaDoConhecimento(): string {
    const candidatas = [
        __dirname,
        path.resolve(process.cwd(), "src/Modules/assistente/conhecimento"),
        path.resolve(process.cwd(), "backend/src/Modules/assistente/conhecimento"),
    ];
    const pasta = candidatas.find((p) => fs.existsSync(path.join(p, "politicas", "comum.md")));
    if (!pasta) throw new Error("Base de conhecimento do assistente não encontrada.");
    return pasta;
}

export function carregarBase(pasta = pastaDoConhecimento()): BaseDeConhecimento {
    const ler = (arquivo: string) => fs.readFileSync(path.join(pasta, "politicas", arquivo), "utf8").trim();

    const artigos = Object.fromEntries(
        PERFIS_ASSISTENTE.map((p) => [p, new Map<string, ArtigoDeAjuda>()]),
    ) as BaseDeConhecimento["artigos"];

    for (const arquivo of arquivosMd(path.join(pasta, "artigos"))) {
        const artigo = lerArtigo(fs.readFileSync(arquivo, "utf8"), path.relative(pasta, arquivo));
        for (const perfil of artigo.perfis) {
            if (artigos[perfil].has(artigo.codigo)) {
                throw new Error(`Código "${artigo.codigo}" repetido para o perfil ${perfil}.`);
            }
            artigos[perfil].set(artigo.codigo, artigo);
        }
    }

    return {
        politicas: {
            comum: ler("comum.md"),
            aluno: ler("aluno.md"),
            professor: ler("professor.md"),
            secretaria: ler("secretaria.md"),
        },
        artigos,
    };
}

let baseEmCache: BaseDeConhecimento | null = null;

export function base(): BaseDeConhecimento {
    baseEmCache ??= carregarBase();
    return baseEmCache;
}

/** O sumário que vai no prompt: uma linha por tópico, só dos artigos que o perfil pode ver. */
export function sumario(conhecimento: BaseDeConhecimento, perfil: PerfilAssistente): string {
    return [...conhecimento.artigos[perfil].values()]
        .map((a) => `- ${a.codigo}: ${a.resumo} (tela ${a.tela})`)
        .join("\n");
}

/** O texto que a IA recebe ao consultar um tópico. Código de outro perfil é tratado como inexistente. */
export function respostaDaAjuda(conhecimento: BaseDeConhecimento, perfil: PerfilAssistente, codigo: string): string {
    const artigo = conhecimento.artigos[perfil].get(String(codigo ?? "").trim().toLowerCase());
    if (!artigo) {
        return `Não existe o tópico "${codigo}". Tópicos disponíveis:\n${sumario(conhecimento, perfil)}`;
    }
    return `${artigo.titulo}\n${artigo.conteudo}\n\nLink da tela: [Abrir ${artigo.tela}](${artigo.rota})`;
}

export function promptDoSistema(conhecimento: BaseDeConhecimento, perfil: PerfilAssistente): string {
    return [
        conhecimento.politicas.comum,
        conhecimento.politicas[perfil],
        "## Sumário da base de ajuda\n\nCódigo: assunto. Passe o código em `consultarAjuda`.\n\n" + sumario(conhecimento, perfil),
    ].join("\n\n");
}
