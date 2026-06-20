import { api } from "../lib/axios";
import type {
    AtualizarProfessorDTO,
    CriarProfessorDTO,
    Professor,
    ProfessorOpcao,
} from "../models/professor-model";

export const professorApi = {
    async listar(ativo?: boolean): Promise<Professor[]> {
        const response = await api.get<Professor[]>("/professores", { params: ativo === undefined ? undefined : { ativo } });
        return response.data;
    },

    async listarOpcoes(): Promise<ProfessorOpcao[]> {
        const response = await api.get<ProfessorOpcao[]>("/professores/opcoes");
        return response.data;
    },

    async buscarPorId(id: string): Promise<Professor> {
        const response = await api.get<Professor>(`/professores/${id}`);
        return response.data;
    },

    async criar(data: CriarProfessorDTO): Promise<Professor> {
        const response = await api.post<Professor>("/professores", data);
        return response.data;
    },

    async atualizar(id: string, data: AtualizarProfessorDTO): Promise<Professor> {
        const response = await api.put<Professor>(`/professores/${id}`, data);
        return response.data;
    },

    async deletar(id: string): Promise<void> {
        await api.delete(`/professores/${id}`);
    },

    async reativar(id: string): Promise<Professor> {
        const response = await api.patch<Professor>(`/professores/${id}/reativar`);
        return response.data;
    },
};
