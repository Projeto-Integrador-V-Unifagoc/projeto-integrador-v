export type PerfilFrequencia = "PROFESSOR" | "ALUNO" | "COORDENADOR";

export interface ContextoFrequenciaGateway {
  usuarioId: string;
  perfil: PerfilFrequencia;
  professorId?: string;
  alunoId?: string;
}

interface RepositorioContextoFrequencia {
  buscarProfessorPorUsuarioId?: (usuarioId: string) => Promise<{ id?: string } | null>;
  buscarProfessorPadraoParaFrequencia?: () => Promise<{ id?: string } | null>;
  buscarAlunoPorUsuarioId?: (usuarioId: string) => Promise<{ id?: string } | null>;
}

const PROFESSOR_DEMO_ID = "00000000-0000-0000-0000-000000000101";
const USUARIO_DEMO_ID = "00000000-0000-0000-0000-000000000001";

export class AuthContextGateway {
  constructor(private repository?: RepositorioContextoFrequencia) {}

  async obterContexto(req?: any): Promise<ContextoFrequenciaGateway> {
    const perfil = (req?.headers?.["x-perfil"] || "PROFESSOR").toString().toUpperCase() as PerfilFrequencia;
    const usuarioId = req?.headers?.["x-usuario-id"]?.toString() || USUARIO_DEMO_ID;
    const professorIdHeader = req?.headers?.["x-professor-id"]?.toString();
    const alunoIdHeader = req?.headers?.["x-aluno-id"]?.toString();

    return {
      usuarioId,
      perfil,
      professorId: await this.resolverProfessorId(perfil, usuarioId, professorIdHeader),
      alunoId: await this.resolverAlunoId(perfil, usuarioId, alunoIdHeader),
    };
  }

  private async resolverProfessorId(
    perfil: PerfilFrequencia,
    usuarioId: string,
    professorIdHeader?: string
  ) {
    if (perfil !== "PROFESSOR") return professorIdHeader;
    if (professorIdHeader) return professorIdHeader;

    try {
      const professorPorUsuario = await this.repository?.buscarProfessorPorUsuarioId?.(usuarioId);
      if (professorPorUsuario?.id) return professorPorUsuario.id;

      const professorPadrao = await this.repository?.buscarProfessorPadraoParaFrequencia?.();
      return professorPadrao?.id || PROFESSOR_DEMO_ID;
    } catch {
      return PROFESSOR_DEMO_ID;
    }
  }

  private async resolverAlunoId(
    perfil: PerfilFrequencia,
    usuarioId: string,
    alunoIdHeader?: string
  ) {
    if (perfil !== "ALUNO") return alunoIdHeader;
    if (alunoIdHeader) return alunoIdHeader;

    try {
      const aluno = await this.repository?.buscarAlunoPorUsuarioId?.(usuarioId);
      return aluno?.id;
    } catch {
      return undefined;
    }
  }
}
