import {
  MatriculaRepository,
  NovaMatriculaDTO,
  MatriculaVinculo,
  MatriculaDetalhada,
  AlunoInfo,
  TurmaDisponivel,
} from '../repository/matriculaRepository';

export class MatriculaService {
  private repository: MatriculaRepository;

  constructor() {
    this.repository = new MatriculaRepository();
  }

  // ── Listagens ─────────────────────────────────────────────────────────────

  async listarTodas(): Promise<MatriculaVinculo[]> {
    return this.repository.listarTodas();
  }

  async listarTodasComDetalhes(): Promise<MatriculaDetalhada[]> {
    return this.repository.listarTodasComDetalhes();
  }

  async listarPorAluno(alunoId: string): Promise<MatriculaVinculo[]> {
    return this.repository.listarPorAluno(alunoId);
  }

  async listarPorAlunoComDetalhes(alunoId: string): Promise<MatriculaDetalhada[]> {
    return this.repository.listarPorAlunoComDetalhes(alunoId);
  }

  async buscarPorId(id: string): Promise<MatriculaDetalhada> {
    const matricula = await this.repository.buscarPorId(id);
    if (!matricula) {
      throw new Error(`Matrícula ${id} não encontrada.`);
    }
    return matricula;
  }

  // ── Busca de aluno ────────────────────────────────────────────────────────

  async buscarAluno(query: string): Promise<AlunoInfo[]> {
    if (!query || query.trim().length < 3) {
      throw new Error('Informe ao menos 3 caracteres para buscar o aluno (CPF ou matrícula).');
    }
    return this.repository.buscarAlunoPorCpfOuMatricula(query.trim());
  }

  async buscarAlunoPorId(alunoId: string): Promise<AlunoInfo> {
    const aluno = await this.repository.buscarAlunoPorId(alunoId);
    if (!aluno) {
      throw new Error(`Aluno ${alunoId} não encontrado.`);
    }
    return aluno;
  }

  // ── Turmas disponíveis ────────────────────────────────────────────────────

  async listarTurmasDisponiveis(cursoId: string): Promise<TurmaDisponivel[]> {
    if (!cursoId) {
      throw new Error('cursoId é obrigatório.');
    }
    return this.repository.listarTurmasDisponiveisPorCurso(cursoId);
  }

  // ── Matrícula ─────────────────────────────────────────────────────────────

  async matricularNovoAluno(dados: NovaMatriculaDTO): Promise<MatriculaDetalhada> {
    if (!dados.alunoId) {
      throw new Error('alunoId é obrigatório.');
    }

    const cursoId = await this.repository.buscarCursoDoAluno(dados.alunoId);
    if (!cursoId) {
      throw new Error(`Aluno ${dados.alunoId} não encontrado.`);
    }

    // Permite indicar uma turma específica ou usar a primeira com vaga
    const turmaId = dados.turmaId
      ?? await this.repository.buscarPrimeiraVagaDisponivel(cursoId);

    if (!turmaId) {
      throw new Error('Não há turmas com vagas disponíveis para o curso deste aluno.');
    }

    const jaMatriculado = await this.repository.alunoJaPossuiMatricula(dados.alunoId, turmaId);
    if (jaMatriculado) {
      throw new Error('Aluno já está matriculado nesta turma.');
    }

    await this.repository.criar(dados.alunoId, turmaId);

    // Retorna o registro completo com todos os detalhes
    const novaMatricula = await this.repository.listarPorAlunoComDetalhes(dados.alunoId)
      .then((list) => list.find((m) => m.turma_id === turmaId));

    if (!novaMatricula) {
      throw new Error('Matrícula criada mas não foi possível retornar os detalhes.');
    }

    return novaMatricula;
  }

  // ── Cancelamento ──────────────────────────────────────────────────────────

  async cancelarMatricula(id: string): Promise<MatriculaVinculo> {
    const matricula = await this.repository.buscarPorId(id);
    if (!matricula) {
      throw new Error(`Matrícula ${id} não encontrada.`);
    }
    if (matricula.status === 'CANCELADO') {
      throw new Error('Esta matrícula já está cancelada.');
    }

    const resultado = await this.repository.cancelarMatricula(id);
    if (!resultado) {
      throw new Error('Falha ao cancelar matrícula.');
    }
    return resultado;
  }

  async atualizarStatus(id: string, status: string): Promise<MatriculaVinculo> {
    const statusValidos = ['MATRICULADO', 'CURSANDO', 'TRANCADO', 'CANCELADO', 'CONCLUIDO'];
    if (!statusValidos.includes(status)) {
      throw new Error(`Status inválido. Use um dos seguintes: ${statusValidos.join(', ')}.`);
    }

    const matricula = await this.repository.buscarPorId(id);
    if (!matricula) {
      throw new Error(`Matrícula ${id} não encontrada.`);
    }

    const resultado = await this.repository.atualizarStatus(id, status);
    if (!resultado) {
      throw new Error('Falha ao atualizar status da matrícula.');
    }
    return resultado;
  }
}
