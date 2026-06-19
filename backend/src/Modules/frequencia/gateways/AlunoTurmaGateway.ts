interface RepositorioAlunoTurma {
  listarAlunosAtivosDaTurma?: (turmaId: string) => Promise<any[]>;
}

export class AlunoTurmaGateway {
  constructor(private repository?: RepositorioAlunoTurma) {}

  async listarAlunosAtivos(turmaId: string) {
    return this.repository?.listarAlunosAtivosDaTurma?.(turmaId) || [];
  }
}
