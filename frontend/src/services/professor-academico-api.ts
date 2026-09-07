import { api } from "../lib/axios";
import type { ProfessorAcademico } from "../models/professor-academico-model";

export const professorAcademicoApi = {
  async listar(): Promise<ProfessorAcademico[]> {
    const response = await api.get<ProfessorAcademico[]>("/professores-academico");
    return response.data;
  },
};
