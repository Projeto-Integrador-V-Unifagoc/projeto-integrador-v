import { api } from "../lib/axios";

export interface SiteBanner {
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

export interface SiteNoticia {
    id: string;
    titulo: string;
    slug: string;
    imagem: string;
    resumo: string;
    conteudo: string;
    categoria_id: string | null;
    categoria_nome?: string | null;
    categoria_slug?: string | null;
    autor: string;
    publicado_em: string | null;
    destaque: boolean;
    status: string;
}

export interface SiteFoto {
    id: string;
    album_id: string;
    arquivo: string;
    titulo: string;
    descricao: string;
    ordem: number;
}

export interface SiteAlbum {
    id: string;
    titulo: string;
    slug: string;
    descricao: string;
    capa: string;
    data: string | null;
    status: string;
    ordem: number;
    total_fotos?: number;
    fotos?: SiteFoto[];
}

export interface SiteCurso {
    id: string;
    nome: string;
    codigo: string;
    departamento?: string;
    resumo: string;
    duracao: string;
    turno: string;
    grau: string;
    imagem: string;
    destaque: boolean;
    inscricoes_abertas: boolean;
}

export interface SiteCursoAdmin extends SiteCurso {
    site_curso_id: string | null;
    ativo: boolean | null;
    ordem: number | null;
}

export interface SiteMenuItem {
    id: string;
    rotulo: string;
    url: string;
    ordem: number;
    ativo: boolean;
    externo: boolean;
}

export interface SiteCategoria {
    id: string;
    nome: string;
    slug: string;
    ordem: number;
}

export type SiteConfiguracoes = Record<string, string>;

export interface SiteConteudo {
    configuracoes: SiteConfiguracoes;
    menu: SiteMenuItem[];
    banners: SiteBanner[];
    noticias: SiteNoticia[];
    albuns: SiteAlbum[];
    cursos: SiteCurso[];
}

export interface SiteResumo {
    noticias_publicadas: number;
    albuns: number;
    fotos: number;
    banners_ativos: number;
    usuarios_administrativos: number;
}

export const sitePublicoApi = {
    async conteudo(): Promise<SiteConteudo> {
        const { data } = await api.get("/site/conteudo");
        return data;
    },

    async noticias(categoria?: string): Promise<SiteNoticia[]> {
        const { data } = await api.get("/site/noticias", { params: categoria ? { categoria } : {} });
        return data;
    },

    async noticia(slug: string): Promise<SiteNoticia> {
        const { data } = await api.get(`/site/noticias/${slug}`);
        return data;
    },

    async albuns(): Promise<SiteAlbum[]> {
        const { data } = await api.get("/site/albuns");
        return data;
    },

    async album(slug: string): Promise<SiteAlbum> {
        const { data } = await api.get(`/site/albuns/${slug}`);
        return data;
    },

    async cursos(): Promise<SiteCurso[]> {
        const { data } = await api.get("/site/cursos");
        return data;
    },

    async configuracoes(): Promise<SiteConfiguracoes> {
        const { data } = await api.get("/site/configuracoes");
        return data;
    },
};

export const inscricaoPublicaApi = {
    async cursos(): Promise<SiteCurso[]> {
        const { data } = await api.get("/publico/cursos");
        return data;
    },

    async matrizCurricular(cursoId: string, periodo?: number) {
        const { data } = await api.get(`/publico/cursos/${cursoId}/matriz-curricular`, {
            params: periodo !== undefined ? { periodo } : {},
        });
        return data;
    },

    async cpfCadastrado(cpf: string): Promise<{ cadastrado: boolean; matricula: number | null }> {
        const { data } = await api.get(`/publico/inscricao/cpf/${cpf.replace(/\D/g, "")}`);
        return { cadastrado: Boolean(data?.cadastrado), matricula: data?.matricula ?? null };
    },

    async emailCadastrado(email: string): Promise<boolean> {
        const { data } = await api.get("/publico/inscricao/email", {
            params: { valor: email.trim().toLowerCase() },
        });
        return Boolean(data?.cadastrado);
    },

    async documentosRecusados(alunoId: string): Promise<Array<{ tipo_documento: string; observacao: string | null }>> {
        const { data } = await api.get(`/publico/inscricao/${alunoId}/documentos-recusados`);
        return Array.isArray(data?.recusados) ? data.recusados : [];
    },

    async inscrever(payload: unknown) {
        const { data } = await api.post("/publico/inscricao", payload);
        return data;
    },

    async enviarDocumento(alunoId: string, tipo: string, arquivo: File) {
        const form = new FormData();
        form.append("aluno_id", alunoId);
        form.append("tipo_documento", tipo);
        form.append("arquivo", arquivo);

        const { data } = await api.post("/publico/inscricao/documentos", form);
        return data;
    },
};

export const siteAdminApi = {
    async resumo(): Promise<SiteResumo> {
        const { data } = await api.get("/admin/site/resumo");
        return data;
    },

    async enviarImagem(arquivo: File): Promise<string> {
        const form = new FormData();
        form.append("imagem", arquivo);

        const { data } = await api.post("/admin/site/imagens", form);
        return data.url;
    },

    async listarBanners(): Promise<SiteBanner[]> {
        const { data } = await api.get("/admin/site/banners");
        return data;
    },

    async criarBanner(payload: Partial<SiteBanner>): Promise<SiteBanner> {
        const { data } = await api.post("/admin/site/banners", payload);
        return data;
    },

    async atualizarBanner(id: string, payload: Partial<SiteBanner>): Promise<SiteBanner> {
        const { data } = await api.put(`/admin/site/banners/${id}`, payload);
        return data;
    },

    async removerBanner(id: string) {
        await api.delete(`/admin/site/banners/${id}`);
    },

    async listarNoticias(status?: string): Promise<SiteNoticia[]> {
        const { data } = await api.get("/admin/site/noticias", { params: status ? { status } : {} });
        return data;
    },

    async criarNoticia(payload: Partial<SiteNoticia>): Promise<SiteNoticia> {
        const { data } = await api.post("/admin/site/noticias", payload);
        return data;
    },

    async atualizarNoticia(id: string, payload: Partial<SiteNoticia>): Promise<SiteNoticia> {
        const { data } = await api.put(`/admin/site/noticias/${id}`, payload);
        return data;
    },

    async removerNoticia(id: string) {
        await api.delete(`/admin/site/noticias/${id}`);
    },

    async listarAlbuns(): Promise<SiteAlbum[]> {
        const { data } = await api.get("/admin/site/albuns");
        return data;
    },

    async buscarAlbum(id: string): Promise<SiteAlbum> {
        const { data } = await api.get(`/admin/site/albuns/${id}`);
        return data;
    },

    async criarAlbum(payload: Partial<SiteAlbum>): Promise<SiteAlbum> {
        const { data } = await api.post("/admin/site/albuns", payload);
        return data;
    },

    async atualizarAlbum(id: string, payload: Partial<SiteAlbum>): Promise<SiteAlbum> {
        const { data } = await api.put(`/admin/site/albuns/${id}`, payload);
        return data;
    },

    async removerAlbum(id: string) {
        await api.delete(`/admin/site/albuns/${id}`);
    },

    async enviarFotos(albumId: string, arquivos: File[]): Promise<SiteFoto[]> {
        const form = new FormData();
        arquivos.forEach((arquivo) => form.append("fotos", arquivo));

        const { data } = await api.post(`/admin/site/albuns/${albumId}/fotos`, form);
        return data;
    },

    async removerFoto(albumId: string, fotoId: string) {
        await api.delete(`/admin/site/albuns/${albumId}/fotos/${fotoId}`);
    },

    async listarConfiguracoes(): Promise<SiteConfiguracoes> {
        const { data } = await api.get("/admin/site/configuracoes");
        return data;
    },

    async salvarConfiguracoes(payload: SiteConfiguracoes): Promise<SiteConfiguracoes> {
        const { data } = await api.put("/admin/site/configuracoes", payload);
        return data;
    },

    async listarMenu(): Promise<SiteMenuItem[]> {
        const { data } = await api.get("/admin/site/menu");
        return data;
    },

    async criarMenuItem(payload: Partial<SiteMenuItem>): Promise<SiteMenuItem> {
        const { data } = await api.post("/admin/site/menu", payload);
        return data;
    },

    async atualizarMenuItem(id: string, payload: Partial<SiteMenuItem>): Promise<SiteMenuItem> {
        const { data } = await api.put(`/admin/site/menu/${id}`, payload);
        return data;
    },

    async removerMenuItem(id: string) {
        await api.delete(`/admin/site/menu/${id}`);
    },

    async listarCursos(): Promise<SiteCursoAdmin[]> {
        const { data } = await api.get("/admin/site/cursos");
        return data;
    },

    async atualizarCurso(cursoId: string, payload: Partial<SiteCursoAdmin>): Promise<SiteCursoAdmin> {
        const { data } = await api.put(`/admin/site/cursos/${cursoId}`, payload);
        return data;
    },
};

export function urlImagem(caminho?: string | null): string {
    if (!caminho) return "";
    if (/^https?:\/\//i.test(caminho)) return caminho;
    if (caminho.startsWith("/uploads/")) {
        return `${api.defaults.baseURL ?? ""}${caminho}`;
    }
    return caminho;
}
