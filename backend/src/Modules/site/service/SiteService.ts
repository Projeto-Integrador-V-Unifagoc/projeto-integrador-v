import { SiteRepository } from "../repository/SiteRepository";

export class SiteError extends Error {
    status: number;

    constructor(mensagem: string, status = 400) {
        super(mensagem);
        this.name = "SiteError";
        this.status = status;
    }
}

const STATUS_PUBLICACAO = ["rascunho", "publicado"];

function texto(valor: unknown, limite: number, campo: string, obrigatorio = false): string {
    const limpo = String(valor ?? "").trim();

    if (obrigatorio && !limpo) throw new SiteError(`O campo "${campo}" é obrigatório.`);
    if (limpo.length > limite) throw new SiteError(`O campo "${campo}" deve ter no máximo ${limite} caracteres.`);

    return limpo;
}

function booleano(valor: unknown, padrao = false): boolean {
    if (valor === undefined || valor === null || valor === "") return padrao;
    return valor === true || valor === "true" || valor === 1 || valor === "1";
}

function inteiro(valor: unknown, padrao = 0): number {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.trunc(numero) : padrao;
}

function data(valor: unknown, campo: string): string | null {
    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime()) ? null : valor.toISOString().slice(0, 10);
    }

    const limpo = String(valor ?? "").trim();
    if (!limpo) return null;

    const iso = limpo.match(/^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/);
    if (iso) return iso[1];

    const brasileiro = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brasileiro) return `${brasileiro[3]}-${brasileiro[2]}-${brasileiro[1]}`;

    throw new SiteError(`O campo "${campo}" deve estar no formato AAAA-MM-DD.`);
}

function statusPublicacao(valor: unknown, padrao = "rascunho"): string {
    const limpo = String(valor ?? padrao).trim().toLowerCase();
    if (!STATUS_PUBLICACAO.includes(limpo)) {
        throw new SiteError(`Status inválido. Use ${STATUS_PUBLICACAO.join(" ou ")}.`);
    }
    return limpo;
}

export function gerarSlug(origem: string): string {
    return origem
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 200);
}

export class SiteService {
    private repo = new SiteRepository();

    async conteudoPublico() {
        const [configuracoes, menu, banners, noticias, albuns, cursos] = await Promise.all([
            this.repo.listarConfiguracoes(),
            this.repo.listarMenu(true),
            this.repo.listarBanners(true),
            this.repo.listarNoticias({ status: "publicado" }),
            this.repo.listarAlbuns(true),
            this.repo.listarCursos({ somenteAtivos: true }),
        ]);

        return { configuracoes, menu, banners, noticias: noticias.slice(0, 6), albuns, cursos };
    }

    listarBanners(somenteAtivos = false) {
        return this.repo.listarBanners(somenteAtivos);
    }

    async criarBanner(body: any) {
        return this.repo.criarBanner(this.normalizarBanner(body, true));
    }

    async atualizarBanner(id: string, body: any) {
        const atual = await this.repo.buscarBanner(id);
        if (!atual) throw new SiteError("Banner não encontrado.", 404);

        const banner = await this.repo.atualizarBanner(id, this.normalizarBanner({ ...atual, ...body }, false));
        if (!banner) throw new SiteError("Banner não encontrado.", 404);
        return banner;
    }

    async removerBanner(id: string) {
        if (!(await this.repo.removerBanner(id))) throw new SiteError("Banner não encontrado.", 404);
        return { removido: true };
    }

    private normalizarBanner(body: any, criando: boolean) {
        return {
            titulo: texto(body.titulo, 180, "título", criando),
            subtitulo: texto(body.subtitulo, 300, "subtítulo"),
            imagem_desktop: texto(body.imagem_desktop, 400, "imagem"),
            imagem_mobile: texto(body.imagem_mobile ?? body.imagem_desktop, 400, "imagem mobile"),
            texto_botao: texto(body.texto_botao, 80, "texto do botão") || "Saiba mais",
            url_botao: texto(body.url_botao, 400, "link do botão") || "/inscricao",
            nova_aba: booleano(body.nova_aba),
            destaque: booleano(body.destaque),
            ativo: booleano(body.ativo, true),
            ordem: inteiro(body.ordem),
        };
    }

    listarCategorias() {
        return this.repo.listarCategorias();
    }

    listarNoticias(filtros: { status?: string; categoria?: string } = {}) {
        return this.repo.listarNoticias(filtros);
    }

    async buscarNoticiaPublica(slug: string) {
        const noticia = await this.repo.buscarNoticiaPorSlug(slug);
        if (!noticia || noticia.status !== "publicado") throw new SiteError("Notícia não encontrada.", 404);
        return noticia;
    }

    async criarNoticia(body: any) {
        const dados = await this.normalizarNoticia(body, true);
        return this.repo.criarNoticia(dados);
    }

    async atualizarNoticia(id: string, body: any) {
        const atual = await this.repo.buscarNoticia(id);
        if (!atual) throw new SiteError("Notícia não encontrada.", 404);

        const dados = await this.normalizarNoticia({ ...atual, ...body }, false, id);
        const noticia = await this.repo.atualizarNoticia(id, dados);
        if (!noticia) throw new SiteError("Notícia não encontrada.", 404);
        return noticia;
    }

    async removerNoticia(id: string) {
        if (!(await this.repo.removerNoticia(id))) throw new SiteError("Notícia não encontrada.", 404);
        return { removido: true };
    }

    private async normalizarNoticia(body: any, criando: boolean, id?: string) {
        const titulo = texto(body.titulo, 200, "título", criando);
        const slug = gerarSlug(texto(body.slug, 220, "slug") || titulo);

        if (!slug) throw new SiteError("Informe um título válido para gerar o endereço da notícia.");
        if (await this.repo.slugEmUso("site_noticia", slug, id)) {
            throw new SiteError("Já existe uma notícia com esse endereço. Altere o título ou o slug.", 409);
        }

        const status = statusPublicacao(body.status);
        const publicado = data(body.publicado_em, "data de publicação");

        return {
            titulo,
            slug,
            imagem: texto(body.imagem, 400, "imagem"),
            resumo: texto(body.resumo, 400, "resumo"),
            conteudo: String(body.conteudo ?? "").trim(),
            categoria_id: body.categoria_id ? String(body.categoria_id) : null,
            autor: texto(body.autor, 140, "autor"),
            publicado_em: status === "publicado" ? publicado ?? new Date().toISOString().slice(0, 10) : publicado,
            destaque: booleano(body.destaque),
            status,
        };
    }

    listarAlbuns(somentePublicados = false) {
        return this.repo.listarAlbuns(somentePublicados);
    }

    async buscarAlbumPublico(slug: string) {
        const album = await this.repo.buscarAlbumPorSlug(slug);
        if (!album || album.status !== "publicado") throw new SiteError("Álbum não encontrado.", 404);

        return { ...album, fotos: await this.repo.listarFotos(album.id) };
    }

    async buscarAlbumAdmin(id: string) {
        const album = await this.repo.buscarAlbum(id);
        if (!album) throw new SiteError("Álbum não encontrado.", 404);

        return { ...album, fotos: await this.repo.listarFotos(album.id) };
    }

    async criarAlbum(body: any) {
        return this.repo.criarAlbum(await this.normalizarAlbum(body, true));
    }

    async atualizarAlbum(id: string, body: any) {
        const atual = await this.repo.buscarAlbum(id);
        if (!atual) throw new SiteError("Álbum não encontrado.", 404);

        const album = await this.repo.atualizarAlbum(id, await this.normalizarAlbum({ ...atual, ...body }, false, id));
        if (!album) throw new SiteError("Álbum não encontrado.", 404);
        return album;
    }

    async removerAlbum(id: string) {
        if (!(await this.repo.removerAlbum(id))) throw new SiteError("Álbum não encontrado.", 404);
        return { removido: true };
    }

    private async normalizarAlbum(body: any, criando: boolean, id?: string) {
        const titulo = texto(body.titulo, 200, "título", criando);
        const slug = gerarSlug(texto(body.slug, 220, "slug") || titulo);

        if (!slug) throw new SiteError("Informe um título válido para gerar o endereço do álbum.");
        if (await this.repo.slugEmUso("site_album", slug, id)) {
            throw new SiteError("Já existe um álbum com esse endereço. Altere o título ou o slug.", 409);
        }

        return {
            titulo,
            slug,
            descricao: texto(body.descricao, 500, "descrição"),
            capa: texto(body.capa, 400, "capa"),
            data: data(body.data, "data"),
            status: statusPublicacao(body.status),
            ordem: inteiro(body.ordem),
        };
    }

    async adicionarFotos(albumId: string, arquivos: { caminho: string; titulo?: string }[]) {
        const album = await this.repo.buscarAlbum(albumId);
        if (!album) throw new SiteError("Álbum não encontrado.", 404);

        const existentes = await this.repo.listarFotos(albumId);

        const fotos = await this.repo.criarFotos(
            arquivos.map((arquivo, indice) => ({
                album_id: albumId,
                arquivo: arquivo.caminho,
                titulo: texto(arquivo.titulo, 200, "título da foto"),
                ordem: existentes.length + indice + 1,
            })),
        );

        if (!album.capa && fotos.length > 0) {
            await this.repo.atualizarAlbum(albumId, { capa: fotos[0].arquivo });
        }

        return fotos;
    }

    async removerFoto(id: string) {
        if (!(await this.repo.removerFoto(id))) throw new SiteError("Foto não encontrada.", 404);
        return { removido: true };
    }

    listarConfiguracoes() {
        return this.repo.listarConfiguracoes();
    }

    async salvarConfiguracoes(body: any) {
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            throw new SiteError("Envie um objeto com as configurações a salvar.");
        }

        const valores: Record<string, string> = {};
        for (const [chave, valor] of Object.entries(body)) {
            valores[texto(chave, 80, "chave", true)] = String(valor ?? "").slice(0, 2000);
        }

        await this.repo.salvarConfiguracoes(valores);
        return this.repo.listarConfiguracoes();
    }

    listarMenu(somenteAtivos = false) {
        return this.repo.listarMenu(somenteAtivos);
    }

    async criarMenuItem(body: any) {
        return this.repo.criarMenuItem(this.normalizarMenuItem(body, true));
    }

    async atualizarMenuItem(id: string, body: any) {
        const item = await this.repo.atualizarMenuItem(id, this.normalizarMenuItem(body, false));
        if (!item) throw new SiteError("Item de menu não encontrado.", 404);
        return item;
    }

    async removerMenuItem(id: string) {
        if (!(await this.repo.removerMenuItem(id))) throw new SiteError("Item de menu não encontrado.", 404);
        return { removido: true };
    }

    private normalizarMenuItem(body: any, criando: boolean) {
        return {
            rotulo: texto(body.rotulo, 120, "rótulo", criando),
            url: texto(body.url, 400, "endereço", criando),
            ordem: inteiro(body.ordem),
            ativo: booleano(body.ativo, true),
            externo: booleano(body.externo),
        };
    }

    async listarCursosPublicos(somenteInscricoes = false) {
        const cursos = await this.repo.listarCursos({ somenteAtivos: true, somenteInscricoes });

        return cursos.map((curso: any) => ({
            id: curso.id,
            nome: curso.nome,
            codigo: curso.codigo,
            departamento: curso.departamento,
            resumo: curso.resumo ?? "",
            duracao: curso.duracao ?? "",
            turno: curso.turno ?? "",
            grau: curso.grau ?? "",
            imagem: curso.imagem ?? "",
            destaque: Boolean(curso.destaque),
            inscricoes_abertas: curso.inscricoes_abertas !== false,
        }));
    }

    async listarCursosAdmin() {
        await this.repo.sincronizarCursos();
        return this.repo.listarCursos();
    }

    async atualizarCursoSite(cursoId: string, body: any) {
        const curso = await this.repo.atualizarCursoSite(cursoId, {
            resumo: texto(body.resumo, 500, "resumo"),
            duracao: texto(body.duracao, 60, "duração"),
            turno: texto(body.turno, 60, "turno"),
            grau: texto(body.grau, 60, "grau"),
            imagem: texto(body.imagem, 400, "imagem"),
            inscricoes_abertas: booleano(body.inscricoes_abertas, true),
            destaque: booleano(body.destaque),
            ativo: booleano(body.ativo, true),
            ordem: inteiro(body.ordem),
        });

        if (!curso) throw new SiteError("Curso não encontrado.", 404);
        return curso;
    }

    cursoAceitaInscricao(cursoId: string) {
        return this.repo.cursoAceitaInscricao(cursoId);
    }

    resumo() {
        return this.repo.resumo();
    }
}
