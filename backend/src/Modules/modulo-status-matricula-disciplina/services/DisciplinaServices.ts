import { v4 as uuidv4 } from "uuid";
import { DisciplinaRepository } from "../repository/DisciplinaRepository";
import { StatusMatriculaDisciplinaCommand } from "../model/Disciplina";

export class DisciplinaService {
    disciplinaRepository = new DisciplinaRepository();

    async criarStatusMatriculaDisciplina(data: any) {
        const status: StatusMatriculaDisciplinaCommand = {
            id: uuidv4(),
            descricao: data.descricao,
        };

        return await this.disciplinaRepository.criarStatusMatriculaDisciplina(status);
    }

    async listarStatusMatriculaDisciplina() {
        return await this.disciplinaRepository.listarStatusMatriculaDisciplina();
    }

    async buscarStatusMatriculaDisciplinaPorId(id: string) {
        return await this.disciplinaRepository.buscarStatusMatriculaDisciplinaPorId(id);
    }

    async atualizarStatusMatriculaDisciplina(id: string, data: { descricao: string }) {
        return await this.disciplinaRepository.atualizarStatusMatriculaDisciplina(id, data);
    }
}
