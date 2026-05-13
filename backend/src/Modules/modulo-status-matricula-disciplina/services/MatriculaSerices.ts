import { v4 as uuidv4 } from "uuid";
import { MatriculaRepository } from "../repository/MatriculaRepository";
import { StatusMatriculaCursoCommand } from "../model/Matricula";

export class MatriculaService {
    matriculaRepository = new MatriculaRepository();

    async criarStatusMatriculaCurso(data: any) {
        const status: StatusMatriculaCursoCommand = {
            id: uuidv4(),
            descricao: data.descricao
        };

        return await this.matriculaRepository.criarStatusMatriculaCurso(status);
    }

    async listarStatusMatriculaCurso() {
        return await this.matriculaRepository.listarStatusMatriculaCurso();
    }

    async buscarStatusMatriculaCursoPorId(id: string) {
        return await this.matriculaRepository.buscarStatusMatriculaCursoPorId(id);
    }
}
