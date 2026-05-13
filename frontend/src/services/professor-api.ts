import { api } from "../lib/axios";

export const professorApi = {
  async listarProfessores() {
    const response = await api.get("/professores");
    return response.data;
  },
};
