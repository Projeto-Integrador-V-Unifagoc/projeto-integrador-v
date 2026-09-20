import { SiteError, SiteService } from "../service/SiteService";

const service = new SiteService();

function responder(res: any, err: any) {
    if (err instanceof SiteError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "Erro ao processar o conteúdo do site." });
}

async function executar(res: any, acao: () => Promise<any>, status = 200) {
    try {
        res.status(status).json(await acao());
    } catch (err) {
        responder(res, err);
    }
}

export class SiteController {
    conteudoPublico(_req: any, res: any) {
        return executar(res, () => service.conteudoPublico());
    }

    bannersPublicos(_req: any, res: any) {
        return executar(res, () => service.listarBanners(true));
    }

    noticiasPublicas(req: any, res: any) {
        return executar(res, () =>
            service.listarNoticias({ status: "publicado", categoria: req.query.categoria }),
        );
    }

    noticiaPublica(req: any, res: any) {
        return executar(res, () => service.buscarNoticiaPublica(req.params.slug));
    }

    albunsPublicos(_req: any, res: any) {
        return executar(res, () => service.listarAlbuns(true));
    }

    albumPublico(req: any, res: any) {
        return executar(res, () => service.buscarAlbumPublico(req.params.slug));
    }

    cursosPublicos(req: any, res: any) {
        return executar(res, () => service.listarCursosPublicos(req.query.inscricoes === "abertas"));
    }

    configuracoesPublicas(_req: any, res: any) {
        return executar(res, () => service.listarConfiguracoes());
    }

    menuPublico(_req: any, res: any) {
        return executar(res, () => service.listarMenu(true));
    }

    categorias(_req: any, res: any) {
        return executar(res, () => service.listarCategorias());
    }

    resumo(_req: any, res: any) {
        return executar(res, () => service.resumo());
    }

    listarBanners(_req: any, res: any) {
        return executar(res, () => service.listarBanners());
    }

    criarBanner(req: any, res: any) {
        return executar(res, () => service.criarBanner(req.body ?? {}), 201);
    }

    atualizarBanner(req: any, res: any) {
        return executar(res, () => service.atualizarBanner(req.params.id, req.body ?? {}));
    }

    removerBanner(req: any, res: any) {
        return executar(res, () => service.removerBanner(req.params.id));
    }

    listarNoticias(req: any, res: any) {
        return executar(res, () => service.listarNoticias({ status: req.query.status }));
    }

    criarNoticia(req: any, res: any) {
        return executar(res, () => service.criarNoticia(req.body ?? {}), 201);
    }

    atualizarNoticia(req: any, res: any) {
        return executar(res, () => service.atualizarNoticia(req.params.id, req.body ?? {}));
    }

    removerNoticia(req: any, res: any) {
        return executar(res, () => service.removerNoticia(req.params.id));
    }

    listarAlbuns(_req: any, res: any) {
        return executar(res, () => service.listarAlbuns());
    }

    buscarAlbum(req: any, res: any) {
        return executar(res, () => service.buscarAlbumAdmin(req.params.id));
    }

    criarAlbum(req: any, res: any) {
        return executar(res, () => service.criarAlbum(req.body ?? {}), 201);
    }

    atualizarAlbum(req: any, res: any) {
        return executar(res, () => service.atualizarAlbum(req.params.id, req.body ?? {}));
    }

    removerAlbum(req: any, res: any) {
        return executar(res, () => service.removerAlbum(req.params.id));
    }

    adicionarFotos(req: any, res: any) {
        const arquivos = (req.files ?? []) as { filename: string; originalname: string }[];

        if (arquivos.length === 0) {
            return res.status(400).json({ error: "Selecione ao menos uma imagem." });
        }

        return executar(
            res,
            () =>
                service.adicionarFotos(
                    req.params.id,
                    arquivos.map((arquivo) => ({
                        caminho: `/uploads/${arquivo.filename}`,
                        titulo: arquivo.originalname.replace(/\.[^.]+$/, ""),
                    })),
                ),
            201,
        );
    }

    removerFoto(req: any, res: any) {
        return executar(res, () => service.removerFoto(req.params.fotoId));
    }

    listarConfiguracoes(_req: any, res: any) {
        return executar(res, () => service.listarConfiguracoes());
    }

    salvarConfiguracoes(req: any, res: any) {
        return executar(res, () => service.salvarConfiguracoes(req.body ?? {}));
    }

    listarMenu(_req: any, res: any) {
        return executar(res, () => service.listarMenu());
    }

    criarMenuItem(req: any, res: any) {
        return executar(res, () => service.criarMenuItem(req.body ?? {}), 201);
    }

    atualizarMenuItem(req: any, res: any) {
        return executar(res, () => service.atualizarMenuItem(req.params.id, req.body ?? {}));
    }

    removerMenuItem(req: any, res: any) {
        return executar(res, () => service.removerMenuItem(req.params.id));
    }

    listarCursos(_req: any, res: any) {
        return executar(res, () => service.listarCursosAdmin());
    }

    atualizarCurso(req: any, res: any) {
        return executar(res, () => service.atualizarCursoSite(req.params.id, req.body ?? {}));
    }

    enviarImagem(req: any, res: any) {
        const arquivo = req.file as { filename: string } | undefined;

        if (!arquivo) return res.status(400).json({ error: "Nenhuma imagem enviada." });
        return res.status(201).json({ url: `/uploads/${arquivo.filename}` });
    }
}
