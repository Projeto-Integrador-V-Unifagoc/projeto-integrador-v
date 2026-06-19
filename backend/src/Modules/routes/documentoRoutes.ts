import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { DocumentoController } from "../modulo-documentos/controller/DocumentoController.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error("Apenas PDF, JPG e PNG são aceitos."));
    },
});

const controller = new DocumentoController();
export const documentoRouter = Router();

documentoRouter.post("/documentos", upload.single("arquivo"), (req, res) => controller.upload(req, res));
documentoRouter.get("/documentos", (req, res) => controller.listarTodos(req, res));
documentoRouter.get("/documentos/aluno/:alunoId", (req, res) => controller.listarPorAluno(req, res));
documentoRouter.patch("/documentos/:id/validar", (req, res) => controller.validar(req, res));
documentoRouter.delete("/documentos/:id", (req, res) => controller.deletar(req, res));
