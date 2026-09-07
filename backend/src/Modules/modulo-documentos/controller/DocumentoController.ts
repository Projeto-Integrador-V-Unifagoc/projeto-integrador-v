import fs from "fs";
import path from "path";

import { DocumentoService } from "../service/DocumentoService";
import {
    DocumentoAuthContext,
    ErroAutorizacaoDocumento,
} from "../service/DocumentoAuthContext";

const service = new DocumentoService();
const authContext = new DocumentoAuthContext();

export class DocumentoController {

    async upload(req: any, res: any) {
        try {
            const contexto = await authContext.obterContexto(req);
            const arquivo = req.file;
            const { tipo_documento } = req.body;

            const aluno_id =
                contexto.perfil === "aluno"
                    ? contexto.alunoId
                    : req.body.aluno_id;

            if (!arquivo) {
                return res.status(400).json({
                    error: "Arquivo é obrigatório.",
                });
            }

            if (!aluno_id) {
                return res.status(400).json({
                    error: "aluno_id é obrigatório.",
                });
            }

            if (!tipo_documento) {
                return res.status(400).json({
                    error: "tipo_documento é obrigatório.",
                });
            }

            const doc = await service.criar({
                aluno_id,
                tipo_documento,
                nome_arquivo: arquivo.originalname,
                caminho_arquivo: arquivo.path,
            });

            return res.status(201).json(doc);

        } catch (err: any) {
            if (err instanceof ErroAutorizacaoDocumento) {
                return res.status(err.status).json({
                    error: err.message,
                });
            }

            return res.status(400).json({
                error: err.message,
            });
        }
    }

    async listarTodos(_req: any, res: any) {
        try {
            return res.status(200).json(
                await service.listarTodos(),
            );

        } catch (err: any) {
            return res.status(500).json({
                error: err.message,
            });
        }
    }

    async listarPorAluno(req: any, res: any) {
        try {
            const contexto = await authContext.obterContexto(req);

            if (
                contexto.perfil === "aluno" &&
                contexto.alunoId !== req.params.alunoId
            ) {
                return res.status(403).json({
                    error: "Acesso negado. Você só pode consultar seus próprios documentos.",
                });
            }

            return res.status(200).json(
                await service.listarPorAluno(req.params.alunoId),
            );

        } catch (err: any) {
            if (err instanceof ErroAutorizacaoDocumento) {
                return res.status(err.status).json({
                    error: err.message,
                });
            }

            return res.status(500).json({
                error: err.message,
            });
        }
    }

    async arquivo(req: any, res: any) {
        try {
            const contexto = await authContext.obterContexto(req);
            const doc = await service.buscarPorId(req.params.id);

            if (
                contexto.perfil === "aluno" &&
                contexto.alunoId !== doc.aluno_id
            ) {
                return res.status(403).json({
                    error: "Acesso negado. Este documento não pertence a você.",
                });
            }

            const caminho = path.resolve(doc.caminho_arquivo);

            if (!fs.existsSync(caminho)) {
                return res.status(404).json({
                    error: "Arquivo não encontrado.",
                });
            }

            return res.sendFile(
                path.basename(caminho),
                {
                    root: path.dirname(caminho),
                },
            );

        } catch (err: any) {
            if (err instanceof ErroAutorizacaoDocumento) {
                return res.status(err.status).json({
                    error: err.message,
                });
            }

            const status =
                err.message.includes("não encontrado")
                    ? 404
                    : 500;

            return res.status(status).json({
                error: err.message,
            });
        }
    }

    async validar(req: any, res: any) {
        try {
            const { status, observacao } = req.body;

            if (!status) {
                return res.status(400).json({
                    error: 'Campo "status" é obrigatório.',
                });
            }

            return res.status(200).json(
                await service.validar(
                    req.params.id,
                    status,
                    observacao,
                ),
            );

        } catch (err: any) {
            const status =
                err.message.includes("não encontrado")
                    ? 404
                    : err.message.includes("inválido")
                        ? 400
                        : 500;

            return res.status(status).json({
                error: err.message,
            });
        }
    }

    async deletar(req: any, res: any) {
        try {
            await service.deletar(req.params.id);

            return res.status(204).send();

        } catch (err: any) {
            const status =
                err.message.includes("não encontrado")
                    ? 404
                    : 500;

            return res.status(status).json({
                error: err.message,
            });
        }
    }
}