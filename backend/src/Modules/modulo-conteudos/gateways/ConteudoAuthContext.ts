import type { Request } from "express";
import { erroConteudo } from "../errors/ConteudoError";
import type { ContextoConteudo } from "../models/Conteudo";

interface RepositorioContexto {
  buscarProfessorPorUsuarioId(usuarioId: string): Promise<{ id?: string; ativo?: boolean } | null | undefined>;
  buscarAlunoPorUsuarioId(usuarioId: string): Promise<{ id?: string } | null | undefined>;
}

// Secretaria e administrador têm acesso total ("gestor"); professor precisa de
// vínculo docente ativo; aluno só lê (as regras de cada rota ficam no service).
export class ConteudoAuthContext {
  constructor(private repository: RepositorioContexto) {}

  async obterContexto(req?: Request): Promise<ContextoConteudo> {
    const user = (req as any)?.user;
    if (!user?.id || !user?.tipo_usuario) throw erroConteudo.proibido("Identidade autenticada inválida.");
    const tipo = String(user.tipo_usuario).trim().toLowerCase();

    if (tipo === "secretaria" || tipo === "administrador") {
      return { usuarioId: String(user.id), perfil: "gestor" };
    }

    if (tipo === "professor") {
      const professor = await this.repository.buscarProfessorPorUsuarioId(String(user.id));
      if (!professor?.id || professor.ativo === false) throw erroConteudo.proibido("Usuário sem vínculo docente ativo.");
      return { usuarioId: String(user.id), perfil: "professor", professorId: String(professor.id) };
    }

    if (tipo === "aluno") {
      const aluno = await this.repository.buscarAlunoPorUsuarioId(String(user.id));
      if (!aluno?.id) throw erroConteudo.proibido("Usuário sem vínculo de aluno.");
      return { usuarioId: String(user.id), perfil: "aluno", alunoId: String(aluno.id) };
    }

    throw erroConteudo.proibido();
  }
}
