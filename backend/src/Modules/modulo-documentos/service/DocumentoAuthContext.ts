import type { Request } from "express";
import { DocumentoRepository } from "../repository/DocumentoRepository";
export type PerfilDocumento = "secretaria" | "aluno";
export interface ContextoDocumento {
    usuarioId: string;
    perfil: PerfilDocumento;
    alunoId?: string;
}
export class ErroAutorizacaoDocumento extends Error {
    status: number;
    constructor(message: string, status = 403) {
        super(message);
        this.status = status;
    }
}
export class DocumentoAuthContext {
    constructor(private repository = new DocumentoRepository()) {}
    async obterContexto(req: Request): Promise<ContextoDocumento> {
        const user = (req as any)?.user;
        if (!user?.id || !user?.tipo_usuario) {
            throw new ErroAutorizacaoDocumento("Identidade autenticada inválida.", 401);
        }
        const tipo = String(user.tipo_usuario).trim().toLowerCase();
        const perfil: PerfilDocumento = tipo === "administrador" ? "secretaria" : (tipo as PerfilDocumento);
        if (!["secretaria", "aluno"].includes(perfil)) {
            throw new ErroAutorizacaoDocumento("Acesso negado. Este recurso é restrito a alunos e à secretaria.");
        }
        const contexto: ContextoDocumento = { usuarioId: String(user.id), perfil };
        if (perfil === "aluno") {
            const aluno = await this.repository.buscarAlunoPorUsuarioId(contexto.usuarioId);
            if (!aluno?.id) {
                throw new ErroAutorizacaoDocumento("Usuário sem vínculo de aluno.");
            }
            contexto.alunoId = String(aluno.id);
        }
        return contexto;
    }
}