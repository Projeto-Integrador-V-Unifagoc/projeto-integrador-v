import { MatriculaRepository, MatriculaVinculo, MatriculaDetalhada, TurmaDisponivel } from "../repository/MatriculaRepository";

const STATUS_VALIDOS = ["MATRICULADO", "CURSANDO", "TRANCADO", "CANCELADO", "CONCLUIDO"];

export class MatriculaService {
    private repository = new MatriculaRepository();

    async listarTurmasDisponiveis(cursoId: string): Promise<TurmaDisponivel[]> {
        if (!cursoId) throw new Error("cursoId é obrigatório.");
        return this.repository.listarTurmasDisponiveis(cursoId);
    }

    async criarMatricula(alunoId: string, turmaId: string): Promise<MatriculaVinculo> {
        if (!alunoId || !turmaId) throw new Error("alunoId e turmaId são obrigatórios.");

        const jaMatriculado = await this.repository.alunoJaMatriculado(alunoId, turmaId);
        if (jaMatriculado) throw new Error("Aluno já está matriculado nesta turma.");

        return this.repository.criar(alunoId, turmaId);
    }

    async listarTodas(): Promise<MatriculaDetalhada[]> {
        return this.repository.listarTodas();
    }

    async listarPorAluno(alunoId: string): Promise<MatriculaDetalhada[]> {
        return this.repository.listarPorAluno(alunoId);
    }

    async cancelar(id: string): Promise<MatriculaVinculo> {
        const mat = await this.repository.buscarPorId(id);
        if (!mat) throw new Error(`Matrícula ${id} não encontrada.`);
        if (mat.status === "CANCELADO") throw new Error("Matrícula já está cancelada.");

        return (await this.repository.cancelar(id))!;
    }

    async atualizarStatus(id: string, status: string): Promise<MatriculaVinculo> {
        if (!STATUS_VALIDOS.includes(status)) {
            throw new Error(`Status inválido. Use: ${STATUS_VALIDOS.join(", ")}.`);
        }
        const mat = await this.repository.buscarPorId(id);
        if (!mat) throw new Error(`Matrícula ${id} não encontrada.`);

        return (await this.repository.atualizarStatus(id, status))!;
    }
}
