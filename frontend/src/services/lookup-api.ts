import axios from 'axios';
import type { Curso, Faculdade, Cidade } from '../models/lookup-model';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
});

export const lookupApi = {

    // -------------------------
    // CURSOS
    // -------------------------
    async buscarCursos(search: string = ''): Promise<Curso[]> {
        const response = await api.get<Curso[]>('/cursos', {
            params: { search },
        });
        return response.data;
    },

    // -------------------------
    // FACULDADES
    // -------------------------
    async buscarFaculdades(search: string = ''): Promise<Faculdade[]> {
        const response = await api.get<Faculdade[]>('/faculdades', {
            params: { search },
        });
        return response.data;
    },

    // -------------------------
    // CIDADES
    // -------------------------
    async buscarCidades(search: string = '', uf: string = ''): Promise<Cidade[]> {
        const response = await api.get<Cidade[]>('/cidades', {
            params: { search, uf },
        });
        return response.data;
    },

    // -------------------------
    // ESTADOS (UFs únicas das cidades)
    // -------------------------
    async buscarEstados(search: string = ''): Promise<{ uf: string; nome: string }[]> {
        const response = await api.get<{ uf: string; nome: string }[]>('/estados', {
            params: { search },
        });
        return response.data;
    },
};