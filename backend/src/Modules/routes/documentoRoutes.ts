import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { DocumentoController } from "../modulo-documentos/controller/DocumentoController.js";
import { autenticar } from "../../middlewares/autenticacao.js";
import { soSecretaria } from "../../middlewares/autorizacao.js";
import {
    extensaoAceita,
    mimeAceito,
    tratarErroDeUpload,
    MENSAGEM_FORMATOS,
} from "../modulo-documentos/service/ValidacaoArquivo.js";
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${randomUUID()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (extensaoAceita(file.originalname) && mimeAceito(file.mimetype)) return cb(null, true);
        cb(new Error(MENSAGEM_FORMATOS));
    },
});
const controller = new DocumentoController();
export const documentoRouter = Router();
documentoRouter.use(autenticar);
const receberArquivo = (req: any, res: any, next: any) =>
    upload.single("arquivo")(req, res, (erro: unknown) => {
        const tratado = tratarErroDeUpload(erro);
        if (tratado) return res.status(tratado.status).json({ error: tratado.mensagem });
        next();
    });

documentoRouter.post("/documentos", receberArquivo, (req, res) => controller.upload(req, res));
documentoRouter.get("/documentos/inscritos", soSecretaria, (req, res) => controller.listarInscritos(req, res));
documentoRouter.get("/documentos/aluno/:alunoId", (req, res) => controller.listarPorAluno(req, res));
documentoRouter.get("/documentos/:id/arquivo", (req, res) => controller.arquivo(req, res));
documentoRouter.get("/documentos", soSecretaria, (req, res) => controller.listarTodos(req, res));
documentoRouter.patch("/documentos/aluno/:alunoId/validar-todos", soSecretaria, (req, res) => controller.validarTodosDoAluno(req, res));
documentoRouter.patch("/documentos/:id/validar", soSecretaria, (req, res) => controller.validar(req, res));
documentoRouter.delete("/documentos/:id", soSecretaria, (req, res) => controller.deletar(req, res));
