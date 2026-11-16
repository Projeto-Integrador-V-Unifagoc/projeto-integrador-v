import { randomUUID } from "node:crypto";
import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { autenticar } from "../../middlewares/autenticacao.js";
import { limiteUploadConteudo } from "../../config/limitesRequisicoes.js";
import { ConteudoController } from "../modulo-conteudos/controller/ConteudoController.js";
import {
  conferirConteudoDoArquivo,
  FORMATOS_ACEITOS,
  tratarErroDeUpload,
  type FormatoPermitido,
} from "../modulo-documentos/service/ValidacaoArquivo.js";
import { UPLOAD_CONTEUDO_DIR } from "../modulo-conteudos/service/pastaUploads.js";

fs.mkdirSync(UPLOAD_CONTEUDO_DIR, { recursive: true });

// DOCX e PPTX são pacotes ZIP: a assinatura confere o contêiner e a extensão define o tipo.
const ASSINATURA_ZIP = FORMATOS_ACEITOS.zip.assinaturas;
const FORMATOS_CONTEUDO: Record<string, FormatoPermitido> = {
  pdf: FORMATOS_ACEITOS.pdf,
  png: FORMATOS_ACEITOS.png,
  jpeg: FORMATOS_ACEITOS.jpeg,
  webp: FORMATOS_ACEITOS.webp,
  gif: FORMATOS_ACEITOS.gif,
  docx: {
    extensoes: [".docx"],
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    assinaturas: ASSINATURA_ZIP,
  },
  pptx: {
    extensoes: [".pptx"],
    mimes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    assinaturas: ASSINATURA_ZIP,
  },
};
const MENSAGEM_FORMATOS_CONTEUDO = "Envie apenas imagem (JPG, PNG, WEBP, GIF), PDF, DOCX ou PPTX.";

const extensaoAceita = (nome: string) =>
  Object.values(FORMATOS_CONTEUDO).some((f) => f.extensoes.includes(path.extname(nome).toLowerCase()));
const mimeAceito = (mime: string) =>
  Object.values(FORMATOS_CONTEUDO).some((f) => f.mimes.includes(String(mime ?? "").toLowerCase()));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_CONTEUDO_DIR),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (extensaoAceita(file.originalname) && mimeAceito(file.mimetype)) return cb(null, true);
    cb(new Error(MENSAGEM_FORMATOS_CONTEUDO));
  },
});

const receberArquivo = (req: any, res: any, next: any) =>
  upload.single("arquivo")(req, res, (erro: unknown) => {
    const tratado = tratarErroDeUpload(erro);
    if (tratado) return res.status(tratado.status).json({ codigo: "DADOS_INVALIDOS", mensagem: tratado.mensagem });
    if (!req.file) return next();
    try {
      conferirConteudoDoArquivo(req.file.path, req.file.originalname, FORMATOS_CONTEUDO, MENSAGEM_FORMATOS_CONTEUDO);
    } catch (e) {
      return res.status(400).json({ codigo: "DADOS_INVALIDOS", mensagem: (e as Error).message });
    }
    next();
  });

const controller = new ConteudoController();

// Montado com prefixo (`app.use("/conteudos", ...)`): o `use(autenticar)` daqui
// não alcança rotas de outros módulos.
export const conteudoRouter = Router();
conteudoRouter.use(autenticar);

// Navegação
conteudoRouter.get("/cursos", controller.listarCursos);
conteudoRouter.get("/cursos/:cursoId/disciplinas", controller.listarDisciplinas);

// Disciplina dentro do curso (curso_disciplina)
conteudoRouter.get("/curso-disciplinas/:id", controller.detalhar);
conteudoRouter.put("/curso-disciplinas/:id/responsavel", controller.transferirResponsavel);
conteudoRouter.put("/curso-disciplinas/:id/ordem", controller.reordenar);
conteudoRouter.post("/curso-disciplinas/:id/topicos", controller.criarTopico);
conteudoRouter.post("/curso-disciplinas/:id/arquivos", limiteUploadConteudo, receberArquivo, controller.enviarArquivo);

// Tópicos
conteudoRouter.patch("/topicos/:id", controller.atualizarTopico);
conteudoRouter.post("/topicos/:id/publicar", controller.publicarTopico);
conteudoRouter.post("/topicos/:id/despublicar", controller.despublicarTopico);
conteudoRouter.post("/topicos/:id/duplicar", controller.duplicarTopico);
conteudoRouter.delete("/topicos/:id", controller.excluirTopico);
conteudoRouter.post("/topicos/:id/paginas", controller.criarPagina);

// Páginas
conteudoRouter.get("/paginas/:id", controller.obterPagina);
conteudoRouter.patch("/paginas/:id", controller.atualizarPagina);
conteudoRouter.put("/paginas/:id", controller.salvarBlocos);
conteudoRouter.post("/paginas/:id/dividir", controller.dividirPagina);
conteudoRouter.post("/paginas/:id/duplicar", controller.duplicarPagina);
conteudoRouter.delete("/paginas/:id", controller.excluirPagina);

// Leitura do conteúdo publicado (aluno) e pré-visualização (quem edita)
conteudoRouter.get("/aluno/turma-disciplinas/:turmaDisciplinaId", controller.conteudoDoAluno);
conteudoRouter.get("/publicado/paginas/:id", controller.paginaPublicada);
conteudoRouter.get("/curso-disciplinas/:id/visualizacao", controller.visualizarComoAluno);

// Arquivos (leitura liberada ao aluno matriculado; regra no service)
conteudoRouter.get("/arquivos/:id", controller.obterArquivo);
