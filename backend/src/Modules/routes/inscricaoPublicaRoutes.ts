import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { db } from "../../database/connection.js";
import { AlunoService } from "../modulo-gestao-alunos/service/AlunoService.js";
import { DocumentoService } from "../modulo-documentos/service/DocumentoService.js";
import { CursoDisciplinaService } from "../modulo-estrutura-academica/service/CursoDisciplinaService.js";
import { SiteService } from "../site/service/SiteService.js";
import {
    conferirConteudoDoArquivo,
    descartarArquivo,
    extensaoAceita,
    mimeAceito,
    tratarErroDeUpload,
    MENSAGEM_FORMATOS,
} from "../modulo-documentos/service/ValidacaoArquivo.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (extensaoAceita(file.originalname) && mimeAceito(file.mimetype)) return cb(null, true);
        cb(new Error(MENSAGEM_FORMATOS));
    },
});

const alunoService = new AlunoService();
const documentoService = new DocumentoService();
const cursoDisciplinaService = new CursoDisciplinaService();
const siteService = new SiteService();

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const inscricaoPublicaRouter = Router();

inscricaoPublicaRouter.get("/publico/cursos", async (_req, res) => {
    try {
        res.status(200).json(await siteService.listarCursosPublicos(true));
    } catch (error) {
        console.error("[publico/cursos]", error);
        res.status(500).json({ error: "Não foi possível carregar os cursos." });
    }
});

inscricaoPublicaRouter.get("/publico/cursos/:id/matriz-curricular", async (req, res) => {
    try {
        if (!(await siteService.cursoAceitaInscricao(req.params.id))) {
            return res.status(404).json({ error: "Curso indisponível para inscrição." });
        }

        const periodo = req.query.periodo !== undefined ? Number(req.query.periodo) : undefined;
        res.status(200).json(await cursoDisciplinaService.listarMatrizCurricularPorCursoId(req.params.id, periodo));
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

inscricaoPublicaRouter.get("/publico/inscricao/cpf/:cpf", async (req, res) => {
    try {
        const cpf = String(req.params.cpf ?? "").replace(/\D/g, "");

        if (cpf.length !== 11) {
            return res.status(400).json({ error: "Informe um CPF válido." });
        }

        const pessoa = await db("pessoa").whereRaw("regexp_replace(cpf, '\\D', '', 'g') = ?", [cpf]).first();

        if (!pessoa) {
            return res.status(200).json({ cadastrado: false, matricula: null });
        }

        const aluno = await db("aluno").where({ pessoa_id: pessoa.id }).first();
        res.status(200).json({ cadastrado: Boolean(aluno), matricula: aluno?.matricula ?? null });
    } catch (error) {
        console.error("[publico/inscricao/cpf]", error);
        res.status(500).json({ error: "Não foi possível verificar o CPF." });
    }
});

inscricaoPublicaRouter.get("/publico/inscricao/email", async (req, res) => {
    try {
        const email = String(req.query.valor ?? "").trim().toLowerCase();

        if (!FORMATO_EMAIL.test(email)) {
            return res.status(400).json({ error: "Informe um e-mail válido." });
        }

        const usuario = await db("usuario").whereRaw("lower(email) = ?", [email]).first();
        res.status(200).json({ cadastrado: Boolean(usuario) });
    } catch (error) {
        console.error("[publico/inscricao/email]", error);
        res.status(500).json({ error: "Não foi possível verificar o e-mail." });
    }
});

inscricaoPublicaRouter.post("/publico/inscricao", async (req, res) => {
    try {
        const dados = req.body ?? {};

        if (!dados?.usuario?.email || !dados?.usuario?.senha) {
            return res.status(400).json({ error: "Informe e-mail e senha para criar o seu acesso." });
        }

        if (!dados?.curso) {
            return res.status(400).json({ error: "Selecione o curso desejado." });
        }

        if (!(await siteService.cursoAceitaInscricao(dados.curso))) {
            return res.status(400).json({ error: "Este curso não está com inscrições abertas." });
        }

        const aluno = await alunoService.criarAluno({ ...dados, usuarioId: undefined });
        res.status(201).json(aluno);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

inscricaoPublicaRouter.get("/publico/inscricao/:alunoId/documentos-recusados", async (req, res) => {
    try {
        const aluno = await db("aluno").where({ id: req.params.alunoId }).first();

        if (!aluno) {
            return res.status(404).json({ error: "Inscrição não encontrada." });
        }

        const matriculaAtiva = await db("matricula")
            .where({ aluno_id: aluno.id })
            .whereNot({ status: "pendente" })
            .first();

        if (matriculaAtiva) {
            return res.status(403).json({ error: "Esta inscrição já foi processada. Use o portal do aluno." });
        }

        const ultimos = db("documento")
            .distinctOn("tipo_documento")
            .where({ aluno_id: aluno.id })
            .orderBy("tipo_documento")
            .orderBy("created_at", "desc")
            .as("ultimos");

        const documentos = await db
            .from(ultimos)
            .select("tipo_documento", "observacao")
            .whereRaw("upper(status) = ?", ["REPROVADO"])
            .orderBy("tipo_documento");

        res.status(200).json({ recusados: documentos });
    } catch (error) {
        console.error("[publico/documentos-recusados]", error);
        res.status(500).json({ error: "Não foi possível carregar os documentos." });
    }
});

const receberArquivo = (req: any, res: any, next: any) =>
    upload.single("arquivo")(req, res, (erro: unknown) => {
        const tratado = tratarErroDeUpload(erro);
        if (tratado) return res.status(tratado.status).json({ error: tratado.mensagem });
        next();
    });

inscricaoPublicaRouter.post("/publico/inscricao/documentos", receberArquivo, async (req, res) => {
    const arquivo = req.file;
    let persistido = false;

    try {
        const alunoId = String(req.body?.aluno_id ?? "").trim();
        const tipoDocumento = String(req.body?.tipo_documento ?? "").trim();

        if (!arquivo) return res.status(400).json({ error: "Arquivo é obrigatório." });
        if (!alunoId) return res.status(400).json({ error: "aluno_id é obrigatório." });
        if (!tipoDocumento) return res.status(400).json({ error: "tipo_documento é obrigatório." });

        conferirConteudoDoArquivo(arquivo.path, arquivo.originalname);

        const aluno = await db("aluno").where({ id: alunoId }).first();
        if (!aluno) return res.status(404).json({ error: "Inscrição não encontrada." });

        const matriculaAtiva = await db("matricula")
            .where({ aluno_id: alunoId })
            .whereNot({ status: "pendente" })
            .first();

        if (matriculaAtiva) {
            return res.status(403).json({ error: "Esta inscrição já foi processada. Envie documentos pelo portal." });
        }

        const documento = await documentoService.criar({
            aluno_id: alunoId,
            tipo_documento: tipoDocumento,
            nome_arquivo: arquivo.originalname,
            caminho_arquivo: arquivo.path,
        });

        persistido = true;
        res.status(201).json(documento);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    } finally {
        if (arquivo && !persistido) descartarArquivo(arquivo.path);
    }
});
