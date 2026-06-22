import { MatriculaRepository, MatriculaVinculo, MatriculaDetalhada, TurmaDisponivel, ConsultaStatusAluno } from "../repository/MatriculaRepository";

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const STATUS_VALIDOS: Record<string, string> = {
    ativa: "ativa",
    ativo: "ativa",
    matriculado: "ativa",
    cursando: "ativa",
    trancada: "trancada",
    trancado: "trancada",
    cancelada: "cancelada",
    cancelado: "cancelada",
    concluida: "concluida",
    concluido: "concluida",
};

export class MatriculaError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
    }
}

export class MatriculaService {
    constructor(private repository = new MatriculaRepository()) {}

    async listarTurmasDisponiveis(cursoId: string, alunoId?: string): Promise<TurmaDisponivel[]> {
        this.validarUuid(cursoId, "Curso inválido.");
        if (alunoId) this.validarUuid(alunoId, "Aluno inválido.");
        return this.repository.listarTurmasDisponiveis(cursoId, alunoId);
    }

    async criarMatricula(alunoId: string, turmaDisciplinaId: string): Promise<MatriculaVinculo> {
        this.validarUuid(alunoId, "Aluno inválido.");
        this.validarUuid(turmaDisciplinaId, "Turma/disciplina inválida.");
        try {
            return await this.repository.criar(alunoId, turmaDisciplinaId);
        } catch (error: any) {
            if (error?.code === "23505" || error?.codigo === "DUPLICADA") throw new MatriculaError("Aluno já está matriculado nesta turma/disciplina.", 409);
            if (error?.codigo === "NAO_ENCONTRADO") throw new MatriculaError(error.message, 404);
            if (["INDISPONIVEL", "SEM_VAGAS"].includes(error?.codigo)) throw new MatriculaError(error.message, 409);
            if (error?.codigo === "CURSO_DIVERGENTE") throw new MatriculaError(error.message, 400);
            throw error;
        }
    }

    async listarTodas(): Promise<MatriculaDetalhada[]> {
        return this.repository.listarTodas();
    }

    async listarPorAluno(alunoId: string): Promise<MatriculaDetalhada[]> {
        return this.repository.listarPorAluno(alunoId);
    }

    async cancelar(id: string): Promise<MatriculaVinculo> {
        const mat = await this.repository.buscarPorId(id);
        if (!mat) throw new MatriculaError(`Matrícula ${id} não encontrada.`, 404);
        if (["cancelada", "cancelado"].includes(String(mat.status).toLowerCase())) {
            throw new MatriculaError("Matrícula já está cancelada.", 409);
        }

        return (await this.repository.cancelar(id))!;
    }

    async consultarStatusPorMatricula(matricula: number): Promise<ConsultaStatusAluno> {
        if (!matricula || isNaN(matricula)) throw new Error("Número de matrícula inválido.");
        const resultado = await this.repository.consultarStatusPorMatricula(matricula);
        if (!resultado) throw new Error(`Aluno com matrícula ${matricula} não encontrado.`);
        return resultado;
    }

    async atualizarStatus(id: string, status: string): Promise<MatriculaVinculo> {
        const statusRecebido = String(status || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const statusNormalizado = STATUS_VALIDOS[statusRecebido];
        if (!statusNormalizado) {
            throw new MatriculaError("Status inválido. Use: ativa, trancada, cancelada ou concluída.", 400);
        }
        const mat = await this.repository.buscarPorId(id);
        if (!mat) throw new MatriculaError(`Matrícula ${id} não encontrada.`, 404);

        return (await this.repository.atualizarStatus(id, statusNormalizado))!;
    }

    private validarUuid(valor: string, mensagem: string) {
        if (!UUID.test(String(valor || ""))) throw new MatriculaError(mensagem, 400);
    }
}
