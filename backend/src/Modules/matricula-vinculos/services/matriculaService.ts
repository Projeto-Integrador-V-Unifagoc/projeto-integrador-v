import { MatriculaRepository, NovaMatriculaDTO, MatriculaVinculo } from '../repository/matriculaRepository';

export class MatriculaService {
  private repository: MatriculaRepository;

  constructor() {
    this.repository = new MatriculaRepository();
  }

  async listarTodas(): Promise<MatriculaVinculo[]> {
    return this.repository.listarTodas();
  }

  async listarPorAluno(alunoId: string): Promise<MatriculaVinculo[]> {
    return this.repository.listarPorAluno(alunoId);
  }

  async matricularNovoAluno(dados: NovaMatriculaDTO): Promise<MatriculaVinculo> {
    if (!dados.alunoId) {
      throw new Error('alunoId é obrigatório.');
    }

    const cursoId = await this.repository.buscarCursoDoAluno(dados.alunoId);
    if (!cursoId) {
      throw new Error(`Aluno ${dados.alunoId} não encontrado.`);
    }

    const turmaId = await this.repository.buscarPrimeiraVagaDisponivel(cursoId);
    if (!turmaId) {
      throw new Error('Não há turmas com vagas disponíveis para o curso deste aluno.');
    }

    const jaMatriculado = await this.repository.alunoJaPossuiMatricula(dados.alunoId, turmaId);
    if (jaMatriculado) {
      throw new Error('Aluno já está matriculado nesta turma.');
    }

    return this.repository.criar(dados.alunoId, turmaId);
  }
}
