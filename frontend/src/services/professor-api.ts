import axios from "axios"
import type { Professor, CriarProfessorDTO, AtualizarProfessorDTO } from "../models/professor-model"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',    
});

export const professorApi = {

    async listar(): Promise<Professor[]> {
        const response = await api.get<Professor[]>('/professores');
        return response.data;
    },

    async buscarPorId(id: string): Promise<Professor>{
        const response = await api.get<Professor>(`/professores/${id}`);
        return response.data;
    },

    async criar(data: CriarProfessorDTO): Promise<Professor>{
        const response = await api.post<Professor>('/professores', data);
        return response.data;
    },

    async atualizar(id: string, data: AtualizarProfessorDTO): Promise<Professor>{
       const response = await api.put<Professor>(`/professores/${id}`, data);
       return response.data;
    },

    async deletar(id: string): Promise<void>{
        await api.delete(`/professores/${id}`);
    },

};