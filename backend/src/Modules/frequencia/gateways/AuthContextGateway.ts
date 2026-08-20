import type { Request } from "express";
import { erroFrequencia } from "../errors/FrequenciaError";

export type PerfilFrequencia = "professor" | "aluno" | "secretaria";
export interface ContextoFrequenciaGateway {
  usuarioId: string;
  perfil: PerfilFrequencia;
  professorId?: string;
  alunoId?: string;
}

interface RepositorioContexto {
  buscarUsuarioPorId(usuarioId: string): Promise<{ id?: string; tipo_usuario?: string } | null>;
  buscarProfessorPorUsuarioId(usuarioId: string): Promise<{ id?: string; ativo?: boolean } | null>;
  buscarAlunoPorUsuarioId(usuarioId: string): Promise<{ id?: string } | null>;
}

export class AuthContextGateway {
  constructor(private repository: RepositorioContexto) {}

  async obterContexto(req?: Request): Promise<ContextoFrequenciaGateway> {
    const user = (req as any)?.user;
    if (!user?.id || !user?.tipo_usuario) throw erroFrequencia.proibido("Identidade autenticada inválida.");
    const tipo = String(user.tipo_usuario).trim().toLowerCase();
    const perfil: PerfilFrequencia = tipo === "administrador" ? "secretaria" : tipo as PerfilFrequencia;
    if (!["secretaria", "professor", "aluno"].includes(perfil)) throw erroFrequencia.proibido();

    const usuario = await this.repository.buscarUsuarioPorId(String(user.id));
    const tipoPersistido = String(usuario?.tipo_usuario || "").trim().toLowerCase();
    if (!usuario?.id || tipoPersistido !== tipo) {
      throw erroFrequencia.proibido("A identidade do token não corresponde a um usuário ativo.");
    }

    const contexto: ContextoFrequenciaGateway = { usuarioId: String(user.id), perfil };
    if (perfil === "professor") {
      const professor = await this.repository.buscarProfessorPorUsuarioId(contexto.usuarioId);
      if (!professor?.id || professor.ativo === false) throw erroFrequencia.proibido("Usuário sem vínculo docente ativo.");
      contexto.professorId = professor.id;
    }
    if (perfil === "aluno") {
      const aluno = await this.repository.buscarAlunoPorUsuarioId(contexto.usuarioId);
      if (!aluno?.id) throw erroFrequencia.proibido("Usuário sem vínculo de aluno.");
      contexto.alunoId = aluno.id;
    }
    return contexto;
  }
}
