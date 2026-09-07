import { ProfessorRepository } from "../repository/ProfessorRepository";

export class ProfessorService {
    professorRepository = new ProfessorRepository();

    async listarProfessores() {
        return await this.professorRepository.listarProfessores();
    }
}
