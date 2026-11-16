import { v4 as uuidv4 } from "uuid";
import { CursoRepository } from "../../modulo-facul-dp-curso/repository/CursoRepository";
import { DisciplinaRepository } from "../../modulo-disciplinas/repository/DisciplinaRepository";
import { CursoDisciplinaCommand } from "../models/CursoDisciplina";
import { CursoDisciplinaRepository } from "../repository/CursoDisciplinaRepository";

export class CursoDisciplinaService {
    cursoDisciplinaRepository = new CursoDisciplinaRepository();
    cursoRepository = new CursoRepository();
    disciplinaRepository = new DisciplinaRepository();

    private validarPeriodoIdeal(periodoIdeal: any) {
        const periodo = Number(periodoIdeal);

        if (!Number.isInteger(periodo) || periodo < 1 || periodo > 12) {
            throw new Error("Periodo ideal deve estar entre 1 e 12");
        }
    }

    async criarCursoDisciplina(data: any) {
        const curso = await this.cursoRepository.buscarCursoRegistroPorId(data.cursoId);

        if (!curso) {
            throw new Error("Curso nao encontrado");
        }

        const disciplina = await this.disciplinaRepository.buscarDisciplinaPorId(data.disciplinaId);

        if (!disciplina) {
            throw new Error("Disciplina nao encontrada");
        }

        const associacaoExistente = await this.cursoDisciplinaRepository.buscarCursoDisciplinaPorCursoEDisciplina(
            data.cursoId,
            data.disciplinaId
        );

        if (associacaoExistente) {
            throw new Error("Disciplina ja associada a este curso");
        }

        this.validarPeriodoIdeal(data.periodoIdeal);

        const cursoDisciplina: CursoDisciplinaCommand = {
            id: uuidv4(),
            curso_id: data.cursoId,
            disciplina_id: data.disciplinaId,
            periodo_ideal: data.periodoIdeal !== undefined && data.periodoIdeal !== "" ? Number(data.periodoIdeal) : undefined,
            obrigatoria: data.obrigatoria ?? true,
            carga_horaria: Number(data.cargaHoraria ?? disciplina.carga_horaria),
            ativo: data.ativo ?? true
        };

        return await this.cursoDisciplinaRepository.criarCursoDisciplina(cursoDisciplina);
    }

    async listarCursoDisciplinas() {
        return await this.cursoDisciplinaRepository.listarCursoDisciplinas();
    }

    async listarMatrizCurricularPorCursoId(cursoId: string, periodo?: number) {
        const curso = await this.cursoRepository.buscarCursoRegistroPorId(cursoId);

        if (!curso) {
            throw new Error("Curso nao encontrado");
        }

        return await this.cursoDisciplinaRepository.listarMatrizCurricularPorCursoId(cursoId, periodo);
    }

    async atualizarCursoDisciplina(id: string, data: any) {
        const associacaoAtual = await this.cursoDisciplinaRepository.buscarCursoDisciplinaPorId(id);

        if (!associacaoAtual) {
            return null;
        }

        if (data.periodoIdeal !== undefined && data.periodoIdeal !== "") {
            this.validarPeriodoIdeal(data.periodoIdeal);
        }

        return await this.cursoDisciplinaRepository.atualizarCursoDisciplina(id, {
            periodo_ideal: data.periodoIdeal !== undefined && data.periodoIdeal !== "" ? Number(data.periodoIdeal) : undefined,
            obrigatoria: data.obrigatoria,
            carga_horaria: data.cargaHoraria !== undefined ? Number(data.cargaHoraria) : undefined,
            ativo: data.ativo
        });
    }

    async removerCursoDisciplina(id: string) {
        try {
            return await this.cursoDisciplinaRepository.removerCursoDisciplina(id);
        } catch (error: any) {
            const textoErro = [error?.constraint, error?.message, error?.detail].map((valor) => String(valor ?? "")).join(" ");

            if (textoErro.includes("professor_disciplina_curso_disciplina_id_foreign")) {
                throw new Error("Nao e possivel remover a disciplina da matriz porque ha professores vinculados a ela neste curso.");
            }

            if (/conteudo_(disciplina|topico|arquivo)_curso_disciplina_id_foreign/.test(textoErro)) {
                throw new Error("Nao e possivel remover a disciplina da matriz porque ela possui conteudo academico cadastrado.");
            }

            if (textoErro.includes("turma_disciplina_curso_disciplina_id_foreign")) {
                throw new Error("Nao e possivel remover a disciplina da matriz porque ela esta sendo usada em turmas.");
            }

            throw error;
        }
    }
}
