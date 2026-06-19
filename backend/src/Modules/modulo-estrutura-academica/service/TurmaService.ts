import { v4 as uuidv4 } from "uuid";
import { CursoRepository } from "../../modulo-facul-dp-curso/repository/CursoRepository";
import { TurmaCommand } from "../models/Turma";
import { PeriodoLetivoRepository } from "../repository/PeriodoLetivoRepository";
import { TurmaRepository } from "../repository/TurmaRepository";

export class TurmaService {
    turmaRepository = new TurmaRepository();
    cursoRepository = new CursoRepository();
    periodoLetivoRepository = new PeriodoLetivoRepository();

    private async validarRelacionamentos(data: any) {
        const curso = await this.cursoRepository.buscarCursoRegistroPorId(data.cursoId);

        if (!curso) {
            throw new Error("Curso nao encontrado");
        }

        const periodoLetivo = await this.periodoLetivoRepository.buscarPeriodoLetivoRegistroPorId(data.periodoLetivoId);

        if (!periodoLetivo) {
            throw new Error("Periodo letivo nao encontrado");
        }

        if (Number(data.capacidadeAlunos) <= 0) {
            throw new Error("Capacidade de alunos deve ser maior que zero");
        }
    }

    async criarTurma(data: any) {
        await this.validarRelacionamentos(data);

        const turmaExistente = await this.turmaRepository.buscarTurmaPorChave(
            data.periodoLetivoId,
            data.cursoId,
            data.sigla
        );

        if (turmaExistente) {
            throw new Error("Ja existe turma com esta sigla para o curso e periodo letivo informados");
        }

        const turma: TurmaCommand = {
            id: uuidv4(),
            periodo_letivo_id: data.periodoLetivoId,
            curso_id: data.cursoId,
            periodo_curricular: Number(data.periodoCurricular),
            descricao: data.descricao,
            sigla: data.sigla,
            capacidade_alunos: Number(data.capacidadeAlunos),
            turno: data.turno,
            status: data.status ?? "ativa"
        };

        return await this.turmaRepository.criarTurma(turma);
    }

    async listarTurmas() {
        return await this.turmaRepository.listarTurmas();
    }

    async buscarTurmaPorId(id: string) {
        return await this.turmaRepository.buscarTurmaPorId(id);
    }

    async atualizarTurma(id: string, data: any) {
        const turmaAtual = await this.turmaRepository.buscarTurmaPorId(id);

        if (!turmaAtual) {
            return null;
        }

        const payload = {
            periodoLetivoId: data.periodoLetivoId ?? turmaAtual.periodo_letivo.id,
            cursoId: data.cursoId ?? turmaAtual.curso.id,
            periodoCurricular: data.periodoCurricular ?? turmaAtual.periodo_curricular,
            descricao: data.descricao ?? turmaAtual.descricao,
            sigla: data.sigla ?? turmaAtual.sigla,
            capacidadeAlunos: data.capacidadeAlunos ?? turmaAtual.capacidade_alunos,
            turno: data.turno ?? turmaAtual.turno,
            status: data.status ?? turmaAtual.status
        };

        await this.validarRelacionamentos(payload);

        if (
            payload.periodoLetivoId !== turmaAtual.periodo_letivo.id ||
            payload.cursoId !== turmaAtual.curso.id ||
            payload.sigla !== turmaAtual.sigla
        ) {
            const turmaExistente = await this.turmaRepository.buscarTurmaPorChave(
                payload.periodoLetivoId,
                payload.cursoId,
                payload.sigla
            );

            if (turmaExistente) {
                throw new Error("Ja existe turma com esta sigla para o curso e periodo letivo informados");
            }
        }

        return await this.turmaRepository.atualizarTurma(id, {
            periodo_letivo_id: payload.periodoLetivoId,
            curso_id: payload.cursoId,
            periodo_curricular: Number(payload.periodoCurricular),
            descricao: payload.descricao,
            sigla: payload.sigla,
            capacidade_alunos: Number(payload.capacidadeAlunos),
            turno: payload.turno,
            status: payload.status
        });
    }

    async removerTurma(id: string) {
        return await this.turmaRepository.removerTurma(id);
    }
}
