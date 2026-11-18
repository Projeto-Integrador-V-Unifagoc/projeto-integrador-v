import { v4 as uuidv4 } from "uuid";
import { CursoRepository } from "../../modulo-facul-dp-curso/repository/CursoRepository";
import { DisciplinaRepository } from "../../modulo-disciplinas/repository/DisciplinaRepository";
import { CursoDisciplinaCommand } from "../models/CursoDisciplina";
import { CursoDisciplinaRepository } from "../repository/CursoDisciplinaRepository";
import { MatrizCurricularRepository } from "../../matriz-curricular/repository/MatrizCurricularRepository";

export class CursoDisciplinaService {
    cursoDisciplinaRepository = new CursoDisciplinaRepository();
    cursoRepository = new CursoRepository();
    disciplinaRepository = new DisciplinaRepository();
    matrizCurricularRepository = new MatrizCurricularRepository();

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

        const matriz = data.matrizCurricularId
            ? await this.matrizCurricularRepository.buscarPorId(data.matrizCurricularId)
            : await this.matrizCurricularRepository.buscarVigentePorCurso(data.cursoId);
        if (!matriz || String(matriz.curso_id) !== String(data.cursoId)) {
            throw new Error("Matriz curricular nao encontrada para o curso");
        }
        if (data.matrizCurricularId && matriz.status !== "RASCUNHO") {
            throw new Error("Disciplinas so podem ser alteradas em matriz em rascunho");
        }

        const associacaoExistente = await this.cursoDisciplinaRepository.buscarCursoDisciplinaPorMatrizEDisciplina(
            matriz.id,
            data.disciplinaId
        );

        if (associacaoExistente) {
            throw new Error("Disciplina ja associada a este curso");
        }

        this.validarPeriodoIdeal(data.periodoIdeal);

        const cursoDisciplina: CursoDisciplinaCommand = {
            id: uuidv4(),
            curso_id: data.cursoId,
            matriz_curricular_id: matriz.id,
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

    async listarMatrizCurricularPorCursoId(cursoId: string, periodo?: number, matrizCurricularId?: string) {
        const curso = await this.cursoRepository.buscarCursoRegistroPorId(cursoId);

        if (!curso) {
            throw new Error("Curso nao encontrado");
        }

        return await this.cursoDisciplinaRepository.listarMatrizCurricularPorCursoId(cursoId, periodo, matrizCurricularId);
    }

    async atualizarCursoDisciplina(id: string, data: any) {
        const associacaoAtual = await this.cursoDisciplinaRepository.buscarCursoDisciplinaPorId(id);

        if (!associacaoAtual) {
            return null;
        }
        if (associacaoAtual.matriz_curricular.status !== "RASCUNHO") {
            throw new Error("Disciplinas so podem ser alteradas em matriz em rascunho");
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
        const associacaoAtual = await this.cursoDisciplinaRepository.buscarCursoDisciplinaPorId(id);
        if (!associacaoAtual) return 0;
        if (associacaoAtual.matriz_curricular.status !== "RASCUNHO") {
            throw new Error("Disciplinas so podem ser removidas de matriz em rascunho");
        }
        return await this.cursoDisciplinaRepository.removerCursoDisciplina(id);
    }
}
