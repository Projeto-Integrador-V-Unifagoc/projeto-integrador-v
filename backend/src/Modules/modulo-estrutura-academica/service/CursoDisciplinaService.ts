import { v4 as uuidv4 } from "uuid";
import { CursoRepository } from "../../modulo-facul-dp-curso/repository/CursoRepository";
import { DisciplinaRepository } from "../../modulo-disciplinas/repository/DisciplinaRepository";
import { CursoDisciplinaCommand } from "../models/CursoDisciplina";
import { CursoDisciplinaRepository } from "../repository/CursoDisciplinaRepository";
import { erroEstruturaAcademica } from "../errors/EstruturaAcademicaError";

export class CursoDisciplinaService {
    cursoDisciplinaRepository = new CursoDisciplinaRepository();
    cursoRepository = new CursoRepository();
    disciplinaRepository = new DisciplinaRepository();

    private validarPeriodoIdeal(periodoIdeal: any) {
        const periodo = Number(periodoIdeal);

        if (!Number.isInteger(periodo) || periodo < 1 || periodo > 12) {
            throw erroEstruturaAcademica.invalido("Periodo ideal deve estar entre 1 e 12");
        }
    }

    private validarCargaHoraria(cargaHoraria: unknown) {
        const carga = Number(cargaHoraria);

        if (!Number.isInteger(carga) || carga <= 0) {
            throw erroEstruturaAcademica.invalido("Carga horaria deve ser um numero inteiro maior que zero");
        }

        return carga;
    }

    async criarCursoDisciplina(data: any) {
        const curso = await this.cursoRepository.buscarCursoRegistroPorId(data.cursoId);

        if (!curso) {
            throw erroEstruturaAcademica.naoEncontrado("Curso nao encontrado");
        }

        const disciplina = await this.disciplinaRepository.buscarDisciplinaPorId(data.disciplinaId);

        if (!disciplina) {
            throw erroEstruturaAcademica.naoEncontrado("Disciplina nao encontrada");
        }

        if (!disciplina.ativo) {
            throw erroEstruturaAcademica.conflito("Disciplina inativa nao pode ser adicionada a matriz curricular");
        }

        const associacaoExistente = await this.cursoDisciplinaRepository.buscarCursoDisciplinaPorCursoEDisciplina(
            data.cursoId,
            data.disciplinaId
        );

        if (associacaoExistente) {
            throw erroEstruturaAcademica.conflito("Disciplina ja associada a este curso");
        }

        this.validarPeriodoIdeal(data.periodoIdeal);
        const cargaHoraria = this.validarCargaHoraria(data.cargaHoraria ?? disciplina.carga_horaria);

        const cursoDisciplina: CursoDisciplinaCommand = {
            id: uuidv4(),
            curso_id: data.cursoId,
            disciplina_id: data.disciplinaId,
            periodo_ideal: data.periodoIdeal !== undefined && data.periodoIdeal !== "" ? Number(data.periodoIdeal) : undefined,
            obrigatoria: data.obrigatoria ?? true,
            carga_horaria: cargaHoraria,
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
            throw erroEstruturaAcademica.naoEncontrado("Curso nao encontrado");
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

        if (data.cargaHoraria !== undefined) {
            this.validarCargaHoraria(data.cargaHoraria);
        }

        return await this.cursoDisciplinaRepository.atualizarCursoDisciplina(id, {
            periodo_ideal: data.periodoIdeal !== undefined && data.periodoIdeal !== "" ? Number(data.periodoIdeal) : undefined,
            obrigatoria: data.obrigatoria,
            carga_horaria: data.cargaHoraria !== undefined ? Number(data.cargaHoraria) : undefined,
            ativo: data.ativo
        });
    }

    async removerCursoDisciplina(id: string) {
        return await this.cursoDisciplinaRepository.removerCursoDisciplina(id);
    }
}
