import { db } from "../../../database/connection";

export interface Banner {
    id: string;
    titulo: string;
    subtitulo: string;
    imagem_desktop: string;
    imagem_mobile: string;
    texto_botao: string;
    url_botao: string;
    nova_aba: boolean;
    destaque: boolean;
    ativo: boolean;
    ordem: number;
}

export interface Categoria {
    id: string;
    nome: string;
    slug: string;
    ordem: number;
}

export interface Noticia {
    id: string;
    titulo: string;
    slug: string;
    imagem: string;
    resumo: string;
    conteudo: string;
    categoria_id: string | null;
    autor: string;
    publicado_em: string | null;
    destaque: boolean;
    status: string;
}

export interface Album {
    id: string;
    titulo: string;
    slug: string;
    descricao: string;
    capa: string;
    data: string | null;
    status: string;
    ordem: number;
}

export interface Foto {
    id: string;
    album_id: string;
    arquivo: string;
    titulo: string;
    descricao: string;
    ordem: number;
}

export interface MenuItem {
    id: string;
    rotulo: string;
    url: string;
    ordem: number;
    ativo: boolean;
    externo: boolean;
}

export interface CursoSite {
    id: string;
    curso_id: string;
    resumo: string;
    duracao: string;
    turno: string;
    grau: string;
    imagem: string;
    inscricoes_abertas: boolean;
    destaque: boolean;
    ativo: boolean;
    ordem: number;
}

export class SiteRepository {
    listarBanners(somenteAtivos = false) {
        const query = db("site_banner").select("*").orderBy("ordem").orderBy("created_at");
        if (somenteAtivos) query.where({ ativo: true });
        return query;
    }

    async buscarBanner(id: string): Promise<Banner | null> {
        return (await db("site_banner").where({ id }).first()) ?? null;
    }

    async criarBanner(dados: Partial<Banner>): Promise<Banner> {
        const [linha] = await db("site_banner").insert(dados).returning("*");
        return linha;
    }

    async atualizarBanner(id: string, dados: Partial<Banner>): Promise<Banner | null> {
        const [linha] = await db("site_banner")
            .where({ id })
            .update({ ...dados, updated_at: db.fn.now() })
            .returning("*");
        return linha ?? null;
    }

    async removerBanner(id: string): Promise<boolean> {
        return (await db("site_banner").where({ id }).delete()) > 0;
    }

    listarCategorias() {
        return db("site_categoria").select("*").orderBy("ordem").orderBy("nome");
    }

    listarNoticias(filtros: { status?: string; categoria?: string } = {}) {
        const query = db("site_noticia as n")
            .leftJoin("site_categoria as c", "n.categoria_id", "c.id")
            .select("n.*", "c.nome as categoria_nome", "c.slug as categoria_slug")
            .orderBy("n.publicado_em", "desc")
            .orderBy("n.created_at", "desc");

        if (filtros.status) query.where("n.status", filtros.status);
        if (filtros.categoria) query.where("c.slug", filtros.categoria);
        return query;
    }

    async buscarNoticiaPorSlug(slug: string) {
        return (
            (await db("site_noticia as n")
                .leftJoin("site_categoria as c", "n.categoria_id", "c.id")
                .select("n.*", "c.nome as categoria_nome", "c.slug as categoria_slug")
                .where("n.slug", slug)
                .first()) ?? null
        );
    }

    async buscarNoticia(id: string): Promise<Noticia | null> {
        return (await db("site_noticia").where({ id }).first()) ?? null;
    }

    async criarNoticia(dados: Partial<Noticia>): Promise<Noticia> {
        const [linha] = await db("site_noticia").insert(dados).returning("*");
        return linha;
    }

    async atualizarNoticia(id: string, dados: Partial<Noticia>): Promise<Noticia | null> {
        const [linha] = await db("site_noticia")
            .where({ id })
            .update({ ...dados, updated_at: db.fn.now() })
            .returning("*");
        return linha ?? null;
    }

    async removerNoticia(id: string): Promise<boolean> {
        return (await db("site_noticia").where({ id }).delete()) > 0;
    }

    async slugEmUso(tabela: "site_noticia" | "site_album", slug: string, ignorarId?: string) {
        const query = db(tabela).where({ slug });
        if (ignorarId) query.whereNot({ id: ignorarId });
        return Boolean(await query.first());
    }

    listarAlbuns(somentePublicados = false) {
        const query = db("site_album as a")
            .select("a.*", db.raw("(select count(*)::int from site_foto f where f.album_id = a.id) as total_fotos"))
            .orderBy("a.ordem")
            .orderBy("a.data", "desc");
        if (somentePublicados) query.where("a.status", "publicado");
        return query;
    }

    async buscarAlbumPorSlug(slug: string) {
        return (await db("site_album").where({ slug }).first()) ?? null;
    }

    async buscarAlbum(id: string): Promise<Album | null> {
        return (await db("site_album").where({ id }).first()) ?? null;
    }

    async criarAlbum(dados: Partial<Album>): Promise<Album> {
        const [linha] = await db("site_album").insert(dados).returning("*");
        return linha;
    }

    async atualizarAlbum(id: string, dados: Partial<Album>): Promise<Album | null> {
        const [linha] = await db("site_album")
            .where({ id })
            .update({ ...dados, updated_at: db.fn.now() })
            .returning("*");
        return linha ?? null;
    }

    async removerAlbum(id: string): Promise<boolean> {
        return (await db("site_album").where({ id }).delete()) > 0;
    }

    listarFotos(albumId: string) {
        return db("site_foto").where({ album_id: albumId }).orderBy("ordem").orderBy("created_at");
    }

    async criarFotos(fotos: Partial<Foto>[]): Promise<Foto[]> {
        if (fotos.length === 0) return [];
        return db("site_foto").insert(fotos).returning("*");
    }

    async removerFoto(id: string): Promise<boolean> {
        return (await db("site_foto").where({ id }).delete()) > 0;
    }

    async listarConfiguracoes(): Promise<Record<string, string>> {
        const linhas = await db("site_configuracao").select("chave", "valor");
        return linhas.reduce((acc: Record<string, string>, linha: any) => {
            acc[linha.chave] = linha.valor;
            return acc;
        }, {});
    }

    async salvarConfiguracoes(valores: Record<string, string>): Promise<void> {
        const chaves = Object.keys(valores);
        if (chaves.length === 0) return;

        await db.transaction(async (trx) => {
            for (const chave of chaves) {
                await trx("site_configuracao")
                    .insert({ chave, valor: String(valores[chave] ?? ""), updated_at: trx.fn.now() })
                    .onConflict("chave")
                    .merge(["valor", "updated_at"]);
            }
        });
    }

    listarMenu(somenteAtivos = false) {
        const query = db("site_menu_item").select("*").orderBy("ordem");
        if (somenteAtivos) query.where({ ativo: true });
        return query;
    }

    async criarMenuItem(dados: Partial<MenuItem>): Promise<MenuItem> {
        const [linha] = await db("site_menu_item").insert(dados).returning("*");
        return linha;
    }

    async atualizarMenuItem(id: string, dados: Partial<MenuItem>): Promise<MenuItem | null> {
        const [linha] = await db("site_menu_item")
            .where({ id })
            .update({ ...dados, updated_at: db.fn.now() })
            .returning("*");
        return linha ?? null;
    }

    async removerMenuItem(id: string): Promise<boolean> {
        return (await db("site_menu_item").where({ id }).delete()) > 0;
    }

    listarCursos(filtros: { somenteAtivos?: boolean; somenteInscricoes?: boolean } = {}) {
        const query = db("curso as c")
            .leftJoin("site_curso as s", "s.curso_id", "c.id")
            .join("departamento as d", "c.departamento_id", "d.id")
            .select(
                "c.id",
                "c.nome",
                "c.codigo",
                "d.nome as departamento",
                "s.id as site_curso_id",
                "s.resumo",
                "s.duracao",
                "s.turno",
                "s.grau",
                "s.imagem",
                "s.inscricoes_abertas",
                "s.destaque",
                "s.ativo",
                "s.ordem",
            )
            .orderByRaw("coalesce(s.ordem, 999)")
            .orderBy("c.nome");

        if (filtros.somenteAtivos) query.where("s.ativo", true);
        if (filtros.somenteInscricoes) query.where("s.inscricoes_abertas", true);
        return query;
    }

    async sincronizarCursos(): Promise<number> {
        const novos = await db("curso as c")
            .leftJoin("site_curso as s", "s.curso_id", "c.id")
            .whereNull("s.id")
            .select("c.id");

        if (novos.length === 0) return 0;

        const linha: any = await db("site_curso").max("ordem as maior").first();
        const inicio = Number(linha?.maior ?? 0);

        await db("site_curso").insert(
            novos.map((curso: { id: string }, indice: number) => ({
                curso_id: curso.id,
                ordem: inicio + indice + 1,
            })),
        );

        return novos.length;
    }

    async atualizarCursoSite(cursoId: string, dados: Partial<CursoSite>): Promise<CursoSite | null> {
        const existente = await db("site_curso").where({ curso_id: cursoId }).first();

        if (!existente) {
            const [criado] = await db("site_curso")
                .insert({ ...dados, curso_id: cursoId })
                .returning("*");
            return criado;
        }

        const [linha] = await db("site_curso")
            .where({ curso_id: cursoId })
            .update({ ...dados, updated_at: db.fn.now() })
            .returning("*");
        return linha ?? null;
    }

    async cursoAceitaInscricao(cursoId: string): Promise<boolean> {
        const linha = await db("curso as c")
            .leftJoin("site_curso as s", "s.curso_id", "c.id")
            .where("c.id", cursoId)
            .select("s.inscricoes_abertas")
            .first();

        if (!linha) return false;
        return linha.inscricoes_abertas !== false;
    }

    async resumo() {
        const [noticias] = await db("site_noticia").where({ status: "publicado" }).count("id as total");
        const [albuns] = await db("site_album").count("id as total");
        const [fotos] = await db("site_foto").count("id as total");
        const [banners] = await db("site_banner").where({ ativo: true }).count("id as total");
        const [usuarios] = await db("usuario").whereIn("tipo_usuario", ["administrador", "secretaria"]).count("id as total");

        return {
            noticias_publicadas: Number(noticias.total),
            albuns: Number(albuns.total),
            fotos: Number(fotos.total),
            banners_ativos: Number(banners.total),
            usuarios_administrativos: Number(usuarios.total),
        };
    }
}
