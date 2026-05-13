import { v4 as uuidv4 } from "uuid";
import { TurmaDisciplinaCommand } from "../models/TurmaDisciplina";
import { CursoDisciplinaRepository } from "../repository/CursoDisciplinaRepository";
import { TurmaDisciplinaRepository } from "../repository/TurmaDisciplinaRepository";
import { TurmaRepository } from "../repository/TurmaRepository";
import { ProfessorRepository } from "../../modulo-professores/repository/ProfessorRepository";

export class TurmaDisciplinaService {
    turmaDisciplinaRepository = new TurmaDisciplinaRepository();
    turmaRepository = new TurmaRepository();
    cursoDisciplinaRepository = new CursoDisciplinaRepository();
    professorRepository = new ProfessorRepository();

    async criarTurmaDisciplina(turmaId: string, data: any) {
        const turma = await this.turmaRepository.buscarTurmaPorId(turmaId);

        if (!turma) {
            throw new Error("Turma nao encontrada");
        }

        const cursoDisciplina = await this.cursoDisciplinaRepository.buscarCursoDisciplinaPorId(data.cursoDisciplinaId);

        if (!cursoDisciplina) {
            throw new Error("Associacao curso disciplina nao encontrada");
        }

        if (cursoDisciplina.curso.id !== turma.curso.id) {
            throw new Error("A disciplina informada nao pertence a matriz curricular do curso da turma");
        }

        const professor = await this.professorRepository.buscarProfessorRegistroPorId(data.professorId);

        if (!professor) {
            throw new Error("Professor nao encontrado");
        }

        const turmaDisciplinaExistente = await this.turmaDisciplinaRepository.buscarTurmaDisciplinaPorTurmaECursoDisciplina(
            turmaId,
            data.cursoDisciplinaId
        );

        if (turmaDisciplinaExistente) {
            throw new Error("Disciplina ja adicionada a esta turma");
        }

        const turmaDisciplina: TurmaDisciplinaCommand = {
            id: uuidv4(),
            turma_id: turmaId,
            curso_disciplina_id: data.cursoDisciplinaId,
            professor_id: data.professorId,
            status: data.status ?? "ativa"
        };

        return await this.turmaDisciplinaRepository.criarTurmaDisciplina(turmaDisciplina);
    }

    async listarTurmaDisciplinasPorTurmaId(turmaId: string) {
        const turma = await this.turmaRepository.buscarTurmaRegistroPorId(turmaId);

        if (!turma) {
            throw new Error("Turma nao encontrada");
        }

        return await this.turmaDisciplinaRepository.listarTurmaDisciplinasPorTurmaId(turmaId);
    }

    async atualizarTurmaDisciplina(turmaId: string, turmaDisciplinaId: string, data: any) {
        const turma = await this.turmaRepository.buscarTurmaRegistroPorId(turmaId);

        if (!turma) {
            throw new Error("Turma nao encontrada");
        }

        const turmaDisciplinaAtual = await this.turmaDisciplinaRepository.buscarTurmaDisciplinaPorId(turmaDisciplinaId);

        if (!turmaDisciplinaAtual || turmaDisciplinaAtual.turma.id !== turmaId) {
            return null;
        }

        if (data.professorId) {
            const professor = await this.professorRepository.buscarProfessorRegistroPorId(data.professorId);

            if (!professor) {
                throw new Error("Professor nao encontrado");
            }
        }

        return await this.turmaDisciplinaRepository.atualizarTurmaDisciplina(turmaDisciplinaId, {
            professor_id: data.professorId,
            status: data.status
        });
    }

    async removerTurmaDisciplina(turmaId: string, turmaDisciplinaId: string) {
        const turmaDisciplina = await this.turmaDisciplinaRepository.buscarTurmaDisciplinaPorId(turmaDisciplinaId);

        if (!turmaDisciplina || turmaDisciplina.turma.id !== turmaId) {
            return 0;
        }

        return await this.turmaDisciplinaRepository.removerTurmaDisciplina(turmaDisciplinaId);
    }
}
