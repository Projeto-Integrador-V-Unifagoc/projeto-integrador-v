import {
    MatriculaRepository,
    MatriculaDetalhada,
    TurmaDisponivel,
    DisciplinaDaTurma,
    VinculoDetalhado,
    ConsultaStatusAluno,
    STATUS_MATRICULA,
} from "../repository/MatriculaRepository";
import { MatriculaError } from "../errors/MatriculaError";

const PG_UNIQUE_VIOLATION = "23505";

export interface ResultadoMatricula {
    id: string;
    aluno_id: string;
    curso_id: string;
    turma_id: string;
    status: string;
    data_matricula: string;
    disciplinas_vinculadas: number;
}

export class MatriculaService {
    // O repositório entra pelo construtor para que o service possa ser testado
    // com um dublê, sem exigir uma conexão real com o PostgreSQL. O valor padrão
    // preserva o uso atual do controller (`new MatriculaService()`).
    constructor(private readonly repository: MatriculaRepository = new MatriculaRepository()) {}

    async listarTurmasDisponiveis(cursoId: string): Promise<TurmaDisponivel[]> {
        if (!cursoId) throw MatriculaError.dadosInvalidos("cursoId é obrigatório.");
        return this.repository.listarTurmasDisponiveis(cursoId);
    }

    async listarDisciplinasDaTurma(turmaId: string): Promise<DisciplinaDaTurma[]> {
        if (!turmaId) throw MatriculaError.dadosInvalidos("turmaId é obrigatório.");

        const turma = await this.repository.buscarTurma(turmaId);
        if (!turma) throw MatriculaError.naoEncontrado(`Turma ${turmaId} não encontrada.`);

        return this.repository.listarDisciplinasDaTurma(turmaId);
    }

    async criarMatricula(
        alunoId: string,
        turmaId: string,
        turmaDisciplinaIds?: string[]
    ): Promise<ResultadoMatricula> {
        if (!alunoId || !turmaId) {
            throw MatriculaError.dadosInvalidos("alunoId e turmaId são obrigatórios.");
        }

        try {
            return await this.repository.transacao(async (trx) => {
                const aluno = await this.repository.buscarAluno(alunoId, trx);
                if (!aluno) throw MatriculaError.naoEncontrado(`Aluno ${alunoId} não encontrado.`);

                const turma = await this.repository.buscarTurma(turmaId, trx);
                if (!turma) throw MatriculaError.naoEncontrado(`Turma ${turmaId} não encontrada.`);

                if (String(turma.status).toLowerCase() !== "ativa") {
                    throw MatriculaError.conflito("Esta turma não está ativa para matrícula.");
                }

                if (aluno.curso_id && aluno.curso_id !== turma.curso_id) {
                    throw MatriculaError.conflito("A turma selecionada não pertence ao curso do aluno.");
                }

                const matriculaEmAberto = await this.repository.buscarMatriculaAtivaDoAluno(alunoId, trx);
                if (matriculaEmAberto) {
                    throw MatriculaError.conflito(
                        matriculaEmAberto.turma_id === turmaId
                            ? "Aluno já está matriculado nesta turma."
                            : "Aluno já possui uma matrícula em aberto. Cancele a matrícula atual antes de criar outra."
                    );
                }

                const ocupadas = await this.repository.contarOcupacaoDaTurma(turmaId, trx);
                if (ocupadas >= turma.capacidade_alunos) {
                    throw MatriculaError.conflito("Não há vagas disponíveis nesta turma.");
                }

                const disciplinas = await this.resolverDisciplinas(turmaId, turmaDisciplinaIds, trx);

                const { matricula, vinculosCriados } = await this.repository.criarComVinculos(
                    { alunoId, cursoId: turma.curso_id, turmaId, turmaDisciplinaIds: disciplinas },
                    trx
                );

                return { ...matricula, disciplinas_vinculadas: vinculosCriados };
            });
        } catch (err: any) {
            if (err?.code === PG_UNIQUE_VIOLATION) {
                throw MatriculaError.conflito("Aluno já está matriculado nesta turma.");
            }
            throw err;
        }
    }


    private async resolverDisciplinas(
        turmaId: string,
        turmaDisciplinaIds: string[] | undefined,
        trx: any
    ): Promise<string[]> {
        if (!turmaDisciplinaIds || turmaDisciplinaIds.length === 0) {
            const todas = await this.repository.listarIdsDisciplinasAtivasDaTurma(turmaId, trx);
            if (todas.length === 0) {
                throw MatriculaError.conflito(
                    "Esta turma não possui disciplinas ofertadas. Vincule as disciplinas à turma antes de matricular alunos."
                );
            }
            return todas;
        }

        const unicos = [...new Set(turmaDisciplinaIds)];
        const validas = await this.repository.listarTurmaDisciplinasValidas(turmaId, unicos, trx);

        if (validas.length !== unicos.length) {
            throw MatriculaError.dadosInvalidos(
                "Uma ou mais disciplinas selecionadas não pertencem a esta turma ou não estão ativas."
            );
        }

        return validas.map((v) => v.id);
    }

    async listarTodas(): Promise<MatriculaDetalhada[]> {
        return this.repository.listarTodas();
    }

    async listarPorAluno(alunoId: string): Promise<MatriculaDetalhada[]> {
        if (!alunoId) throw MatriculaError.dadosInvalidos("alunoId é obrigatório.");
        return this.repository.listarPorAluno(alunoId);
    }

    async listarVinculos(matriculaId: string): Promise<VinculoDetalhado[]> {
        const matricula = await this.repository.buscarPorId(matriculaId);
        if (!matricula) throw MatriculaError.naoEncontrado(`Matrícula ${matriculaId} não encontrada.`);
        return this.repository.listarVinculos(matriculaId);
    }

    async consultarPorNumeroMatricula(numeroMatricula: number): Promise<ConsultaStatusAluno> {
        if (!Number.isInteger(numeroMatricula)) {
            throw MatriculaError.dadosInvalidos("Número de matrícula inválido.");
        }
        const resultado = await this.repository.consultarPorNumeroMatricula(numeroMatricula);
        if (!resultado) {
            throw MatriculaError.naoEncontrado(`Aluno com matrícula ${numeroMatricula} não encontrado.`);
        }
        return resultado;
    }

    async cancelar(id: string) {
        const matricula = await this.repository.buscarPorId(id);
        if (!matricula) throw MatriculaError.naoEncontrado(`Matrícula ${id} não encontrada.`);
        if (String(matricula.status).toLowerCase() === "cancelada") {
            throw MatriculaError.conflito("Matrícula já está cancelada.");
        }
        return (await this.repository.cancelarComVinculos(id))!;
    }

    async matricularAutomaticamente(alunoId: string) {
        if (!alunoId) return null;

        const emAberto = await this.repository.buscarMatriculaAtivaDoAluno(alunoId);
        if (emAberto) return null;

        const aluno = await this.repository.buscarAluno(alunoId);
        if (!aluno?.curso_id) return null;

        const turmas = await this.repository.listarTurmasDisponiveis(aluno.curso_id);
        const doPeriodo = turmas.filter(
            (turma) => String(turma.periodo_curricular) === String(aluno.periodo)
        );

        if (doPeriodo.length !== 1) return null;

        return this.criarMatricula(alunoId, doPeriodo[0].id);
    }

    async aprovar(id: string) {
        const matricula = await this.repository.buscarPorId(id);
        if (!matricula) throw MatriculaError.naoEncontrado(`Matrícula ${id} não encontrada.`);

        const atual = String(matricula.status).toLowerCase();
        if (atual === "ativa") throw MatriculaError.conflito("Matrícula já está ativa.");
        if (atual !== "pendente") {
            throw MatriculaError.conflito(
                `Só é possível aprovar uma matrícula pendente. Situação atual: ${atual}.`
            );
        }

        const documentos = await this.repository.resumoDocumentosDoAluno(matricula.aluno_id);
        if (documentos.pendentes > 0 || documentos.reprovados > 0) {
            throw MatriculaError.conflito(
                `Documentação ainda não validada: ${documentos.pendentes} pendente(s) e ${documentos.reprovados} reprovado(s).`
            );
        }

        return (await this.repository.atualizarStatus(id, "ativa"))!;
    }

    async atualizarStatus(id: string, status: string) {
        const normalizado = String(status).toLowerCase();
        if (!STATUS_MATRICULA.includes(normalizado as any)) {
            throw MatriculaError.dadosInvalidos(`Status inválido. Use: ${STATUS_MATRICULA.join(", ")}.`);
        }

        const matricula = await this.repository.buscarPorId(id);
        if (!matricula) throw MatriculaError.naoEncontrado(`Matrícula ${id} não encontrada.`);

        if (normalizado === "ativa" && String(matricula.status).toLowerCase() === "pendente") {
            return this.aprovar(id);
        }

        // Cancelar pela rota de status também precisa encerrar os vínculos,
        // senão o aluno continua aparecendo na chamada do professor.
        if (normalizado === "cancelada") return (await this.repository.cancelarComVinculos(id))!;

        return (await this.repository.atualizarStatus(id, normalizado))!;
    }

    async adicionarDisciplinas(matriculaId: string, turmaDisciplinaIds: string[]) {
        if (!Array.isArray(turmaDisciplinaIds) || turmaDisciplinaIds.length === 0) {
            throw MatriculaError.dadosInvalidos("Informe ao menos uma disciplina.");
        }

        const matricula = await this.repository.buscarPorId(matriculaId);
        if (!matricula) throw MatriculaError.naoEncontrado(`Matrícula ${matriculaId} não encontrada.`);
        if (String(matricula.status).toLowerCase() === "cancelada") {
            throw MatriculaError.conflito("Não é possível vincular disciplinas a uma matrícula cancelada.");
        }

        const unicos = [...new Set(turmaDisciplinaIds)];
        const validas = await this.repository.listarTurmaDisciplinasValidas(matricula.turma_id, unicos);
        if (validas.length !== unicos.length) {
            throw MatriculaError.dadosInvalidos(
                "Uma ou mais disciplinas não pertencem à turma desta matrícula ou não estão ativas."
            );
        }

        const criados = await this.repository.adicionarVinculos(matriculaId, validas.map((v) => v.id));
        return { vinculos_criados: criados, vinculos: await this.repository.listarVinculos(matriculaId) };
    }

    async cancelarVinculo(matriculaId: string, vinculoId: string) {
        const vinculo = await this.repository.buscarVinculo(vinculoId);
        if (!vinculo) throw MatriculaError.naoEncontrado(`Vínculo ${vinculoId} não encontrado.`);
        if (vinculo.matricula_id !== matriculaId) {
            throw MatriculaError.dadosInvalidos("Este vínculo não pertence à matrícula informada.");
        }
        if (String(vinculo.status).toLowerCase() === "cancelada") {
            throw MatriculaError.conflito("Vínculo já está cancelado.");
        }
        return (await this.repository.cancelarVinculo(vinculoId))!;
    }
}
