interface ContextoProfessorTurma {
  perfil?: string;
  professorId?: string;
}

interface RepositorioProfessorTurma {
  professorPossuiTurma?: (professorId: string, turmaId: string) => Promise<boolean>;
}

export class ProfessorTurmaGateway {
  constructor(private repository?: RepositorioProfessorTurma) {}

  async validarVinculo(contexto: ContextoProfessorTurma, turmaId: string) {
    if (contexto.perfil === "COORDENADOR") return true;
    if (contexto.perfil !== "PROFESSOR" || !contexto.professorId) return false;

    // Fallback temporario ate o repository do modulo ser mergeado.
    if (!this.repository?.professorPossuiTurma) return true;

    return this.repository.professorPossuiTurma(contexto.professorId, turmaId);
  }
}
