export interface AlunoAtivoTurma {
  matricula_turma_disciplina_id: string;
  aluno_id: string;
  matricula: number;
  nome: string;
  status: string;
}

interface RepositorioAlunoTurma {
  listarAlunosAtivosDaTurma?: (turmaId: string) => Promise<AlunoAtivoTurma[]>;
}

export class AlunoTurmaGateway {
  constructor(private repository?: RepositorioAlunoTurma) {}

  async listarAlunosAtivos(turmaId: string) {
    return this.repository?.listarAlunosAtivosDaTurma?.(turmaId) || [];
  }
}
