import { randomUUID } from "node:crypto";
import { Router } from "express";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { SiteController } from "../controller/SiteController.js";
import { autenticar } from "../../../middlewares/autenticacao.js";
import { somenteSecretariaOuAdmin } from "../../modulo-matricula/middlewares/perfilAdministrativo.js";

export const UPLOAD_SITE_DIR = process.env.UPLOAD_SITE_DIR ?? path.resolve(process.cwd(), "uploads-site");
fs.mkdirSync(UPLOAD_SITE_DIR, { recursive: true });

const FORMATOS = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_SITE_DIR),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (FORMATOS.includes(file.mimetype)) return cb(null, true);
        cb(new Error("Apenas imagens JPG, PNG, WEBP, AVIF ou SVG são aceitas."));
    },
});

const controller = new SiteController();
export const siteRouter = Router();

const administrativo = [autenticar, somenteSecretariaOuAdmin];

siteRouter.use("/uploads", express.static(UPLOAD_SITE_DIR, { maxAge: "7d" }));

siteRouter.get("/site/conteudo", (req, res) => controller.conteudoPublico(req, res));
siteRouter.get("/site/banners", (req, res) => controller.bannersPublicos(req, res));
siteRouter.get("/site/noticias", (req, res) => controller.noticiasPublicas(req, res));
siteRouter.get("/site/noticias/:slug", (req, res) => controller.noticiaPublica(req, res));
siteRouter.get("/site/albuns", (req, res) => controller.albunsPublicos(req, res));
siteRouter.get("/site/albuns/:slug", (req, res) => controller.albumPublico(req, res));
siteRouter.get("/site/cursos", (req, res) => controller.cursosPublicos(req, res));
siteRouter.get("/site/configuracoes", (req, res) => controller.configuracoesPublicas(req, res));
siteRouter.get("/site/menu", (req, res) => controller.menuPublico(req, res));
siteRouter.get("/site/categorias", (req, res) => controller.categorias(req, res));

siteRouter.get("/admin/site/resumo", ...administrativo, (req, res) => controller.resumo(req, res));

siteRouter.post("/admin/site/imagens", ...administrativo, upload.single("imagem"), (req, res) =>
    controller.enviarImagem(req, res),
);

siteRouter.get("/admin/site/banners", ...administrativo, (req, res) => controller.listarBanners(req, res));
siteRouter.post("/admin/site/banners", ...administrativo, (req, res) => controller.criarBanner(req, res));
siteRouter.put("/admin/site/banners/:id", ...administrativo, (req, res) => controller.atualizarBanner(req, res));
siteRouter.delete("/admin/site/banners/:id", ...administrativo, (req, res) => controller.removerBanner(req, res));

siteRouter.get("/admin/site/noticias", ...administrativo, (req, res) => controller.listarNoticias(req, res));
siteRouter.post("/admin/site/noticias", ...administrativo, (req, res) => controller.criarNoticia(req, res));
siteRouter.put("/admin/site/noticias/:id", ...administrativo, (req, res) => controller.atualizarNoticia(req, res));
siteRouter.delete("/admin/site/noticias/:id", ...administrativo, (req, res) => controller.removerNoticia(req, res));

siteRouter.get("/admin/site/albuns", ...administrativo, (req, res) => controller.listarAlbuns(req, res));
siteRouter.get("/admin/site/albuns/:id", ...administrativo, (req, res) => controller.buscarAlbum(req, res));
siteRouter.post("/admin/site/albuns", ...administrativo, (req, res) => controller.criarAlbum(req, res));
siteRouter.put("/admin/site/albuns/:id", ...administrativo, (req, res) => controller.atualizarAlbum(req, res));
siteRouter.delete("/admin/site/albuns/:id", ...administrativo, (req, res) => controller.removerAlbum(req, res));
siteRouter.post("/admin/site/albuns/:id/fotos", ...administrativo, upload.array("fotos", 20), (req, res) =>
    controller.adicionarFotos(req, res),
);
siteRouter.delete("/admin/site/albuns/:id/fotos/:fotoId", ...administrativo, (req, res) =>
    controller.removerFoto(req, res),
);

siteRouter.get("/admin/site/configuracoes", ...administrativo, (req, res) => controller.listarConfiguracoes(req, res));
siteRouter.put("/admin/site/configuracoes", ...administrativo, (req, res) => controller.salvarConfiguracoes(req, res));

siteRouter.get("/admin/site/menu", ...administrativo, (req, res) => controller.listarMenu(req, res));
siteRouter.post("/admin/site/menu", ...administrativo, (req, res) => controller.criarMenuItem(req, res));
siteRouter.put("/admin/site/menu/:id", ...administrativo, (req, res) => controller.atualizarMenuItem(req, res));
siteRouter.delete("/admin/site/menu/:id", ...administrativo, (req, res) => controller.removerMenuItem(req, res));

siteRouter.get("/admin/site/cursos", ...administrativo, (req, res) => controller.listarCursos(req, res));
siteRouter.put("/admin/site/cursos/:id", ...administrativo, (req, res) => controller.atualizarCurso(req, res));
