import { v4 as uuidv4 } from "uuid";
import { DisciplinaCommand } from "../models/Disciplina";
import { DisciplinaRepository } from "../repository/DisciplinaRepository";

export class DisciplinaService {
    disciplinaRepository = new DisciplinaRepository();

    async criarDisciplina(data: any) {
        const disciplina: DisciplinaCommand = {
            id: uuidv4(),
            codigo: data.codigo,
            nome: data.nome,
            curso_id: data.cursoId,
            pre_requisito: data.preRequisito,
            carga_horaria: Number(data.cargaHoraria)
        };

        return await this.disciplinaRepository.criarDisciplina(disciplina);
    }

    async listarDisciplinas() {
        return await this.disciplinaRepository.listarDisciplinas();
    }

    async buscarDisciplinaPorId(id: string) {
        return await this.disciplinaRepository.buscarDisciplinaPorId(id);
    }

    async atualizarDisciplina(id: string, data: any) {
        const disciplina: Partial<DisciplinaCommand> = {
            codigo: data.codigo,
            nome: data.nome,
            curso_id: data.cursoId,
            pre_requisito: data.preRequisito,
            carga_horaria: data.cargaHoraria !== undefined ? Number(data.cargaHoraria) : undefined
        };

        return await this.disciplinaRepository.atualizarDisciplina(id, disciplina);
    }

    async removerDisciplina(id: string) {
        return await this.disciplinaRepository.removerDisciplina(id);
    }
}
