import type { Request } from "express";
import { erroNota } from "../errors/NotaError.js";
import type { PerfilNota } from "../models/Nota.js";

export interface ContextoNota {
  usuarioId: string;
  perfil: PerfilNota;
  professorId?: string;
  alunoId?: string;
}

interface RepositorioContexto {
  buscarProfessorPorUsuarioId(usuarioId: string): Promise<{ id?: string; ativo?: boolean } | null | undefined>;
  buscarAlunoPorUsuarioId(usuarioId: string): Promise<{ id?: string } | null | undefined>;
}

export class AuthContextGateway {
  constructor(private repository: RepositorioContexto) {}

  async obterContexto(req?: Request): Promise<ContextoNota> {
    const user = (req as any)?.user;
    if (!user?.id || !user?.tipo_usuario) throw erroNota.proibido("Identidade autenticada inválida.");
    const tipo = String(user.tipo_usuario).trim().toLowerCase();
    const perfil: PerfilNota = tipo === "administrador" ? "secretaria" : (tipo as PerfilNota);
    if (!["secretaria", "professor", "aluno"].includes(perfil)) throw erroNota.proibido();

    const contexto: ContextoNota = { usuarioId: String(user.id), perfil };
    if (perfil === "professor") {
      const professor = await this.repository.buscarProfessorPorUsuarioId(contexto.usuarioId);
      if (!professor?.id || professor.ativo === false) throw erroNota.proibido("Usuário sem vínculo docente ativo.");
      contexto.professorId = String(professor.id);
    }
    if (perfil === "aluno") {
      const aluno = await this.repository.buscarAlunoPorUsuarioId(contexto.usuarioId);
      if (!aluno?.id) throw erroNota.proibido("Usuário sem vínculo de aluno.");
      contexto.alunoId = String(aluno.id);
    }
    return contexto;
  }
}
