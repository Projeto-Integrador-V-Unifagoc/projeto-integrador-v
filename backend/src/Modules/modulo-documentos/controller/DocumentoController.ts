import fs from "fs";
import path from "path";
import { DocumentoService } from "../service/DocumentoService";

const service = new DocumentoService();

export class DocumentoController {

    async upload(req: any, res: any) {
        try {
            const arquivo = req.file;
            const { aluno_id, tipo_documento } = req.body;

            if (!arquivo) return res.status(400).json({ error: "Arquivo é obrigatório." });
            if (!aluno_id) return res.status(400).json({ error: "aluno_id é obrigatório." });
            if (!tipo_documento) return res.status(400).json({ error: "tipo_documento é obrigatório." });

            const doc = await service.criar({
                aluno_id,
                tipo_documento,
                nome_arquivo: arquivo.originalname,
                caminho_arquivo: arquivo.path,
            });
            res.status(201).json(doc);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    async listarTodos(_req: any, res: any) {
        try {
            res.status(200).json(await service.listarTodos());
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async listarPorAluno(req: any, res: any) {
        try {
            res.status(200).json(await service.listarPorAluno(req.params.alunoId));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async arquivo(req: any, res: any) {
        try {
            const doc = await service.buscarPorId(req.params.id);
            const caminho = path.resolve(doc.caminho_arquivo);
            if (!fs.existsSync(caminho)) {
                return res.status(404).json({ error: "Arquivo não encontrado." });
            }
            res.sendFile(caminho);
        } catch (err: any) {
            const status = err.message.includes("não encontrado") ? 404 : 500;
            res.status(status).json({ error: err.message });
        }
    }

    async validar(req: any, res: any) {
        try {
            const { status, observacao } = req.body;
            if (!status) return res.status(400).json({ error: 'Campo "status" é obrigatório.' });
            res.status(200).json(await service.validar(req.params.id, status, observacao));
        } catch (err: any) {
            const status = err.message.includes("não encontrado") ? 404
                : err.message.includes("inválido") ? 400 : 500;
            res.status(status).json({ error: err.message });
        }
    }

    async deletar(req: any, res: any) {
        try {
            await service.deletar(req.params.id);
            res.status(204).send();
        } catch (err: any) {
            const status = err.message.includes("não encontrado") ? 404 : 500;
            res.status(status).json({ error: err.message });
        }
    }
}
