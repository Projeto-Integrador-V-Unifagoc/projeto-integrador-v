import { v4 as uuidv4 } from "uuid";
import { DisciplinaRepository } from "../repository/DisciplinaRepository";
import { StatusMatriculaDisciplinaCommand } from "../model/Disciplina";

export class DisciplinaService {
    disciplinaRepository = new DisciplinaRepository();

    async criarStatusMatriculaDisciplina(data: any) {
        const status: StatusMatriculaDisciplinaCommand = {
            id: uuidv4(),
            codigo: data.codigo,
            nome: data.nome,
            descricao: data.descricao,
            ativo: data.ativo ?? true
        };

        return await this.disciplinaRepository.criarStatusMatriculaDisciplina(status);
    }

    async listarStatusMatriculaDisciplina() {
        return await this.disciplinaRepository.listarStatusMatriculaDisciplina();
    }

    async buscarStatusMatriculaDisciplinaPorId(id: string) {
        return await this.disciplinaRepository.buscarStatusMatriculaDisciplinaPorId(id);
    }
}
