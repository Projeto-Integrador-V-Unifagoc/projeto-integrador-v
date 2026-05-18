import axios from "axios";
import type { Professor, CriarProfessorDTO, AtualizarProfessorDTO } from "../models/professor-model";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
});

const STORAGE_KEY = "clean-professores";

type ProfessorStorageItem = Professor & Omit<CriarProfessorDTO, "data_nascimento"> & {
    data_nascimento: string;
};

function isRecoverableError(error: unknown) {
    return axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
}

function getStorage() {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        return JSON.parse(raw) as ProfessorStorageItem[];
    } catch {
        return [];
    }
}

function saveStorage(data: ProfessorStorageItem[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function buildProfessorRecord(data: CriarProfessorDTO): ProfessorStorageItem {
    return {
        ...data,
        id: crypto.randomUUID(),
        nome: data.nome,
        email: data.email,
        cpf: data.cpf,
        curso: data.curso_nome || data.curso_id,
        curso_id: data.curso_id,
        faculdade: data.faculdade_nome || data.faculdade_id,
        faculdade_id: data.faculdade_id,
        data_nascimento: String(data.data_nascimento),
        logradouro: data.logradouro,
        numero: data.numero,
        bairro: data.bairro,
        cidade_id: data.cidade_id,
        estado: data.estado,
        cep: data.cep,
    };
}

export const professorApi = {
    async listar(): Promise<Professor[]> {
        try {
            const response = await api.get<Professor[]>('/professores');
            return response.data;
        } catch (error) {
            if (!isRecoverableError(error)) throw error;
            return getStorage();
        }
    },

    async buscarPorId(id: string): Promise<Professor> {
        try {
            const response = await api.get<Professor>(`/professores/${id}`);
            return response.data;
        } catch (error) {
            if (!isRecoverableError(error)) throw error;

            const professor = getStorage().find((item) => item.id === id);
            if (!professor) {
                throw new Error("Professor nao encontrado.");
            }
            return professor;
        }
    },

    async criar(data: CriarProfessorDTO): Promise<Professor> {
        try {
            const response = await api.post<Professor>('/professores', data);
            return response.data;
        } catch (error) {
            if (!isRecoverableError(error)) throw error;

            const professores = getStorage();

            if (professores.some((item) => item.email.toLowerCase() === data.email.toLowerCase())) {
                throw new Error("Ja existe um professor cadastrado com este e-mail.");
            }

            if (professores.some((item) => item.cpf === data.cpf)) {
                throw new Error("Ja existe um professor cadastrado com este CPF.");
            }

            const novoProfessor = buildProfessorRecord(data);
            professores.push(novoProfessor);
            saveStorage(professores);
            return novoProfessor;
        }
    },

    async atualizar(id: string, data: AtualizarProfessorDTO): Promise<Professor> {
        try {
            const response = await api.put<Professor>(`/professores/${id}`, data);
            return response.data;
        } catch (error) {
            if (!isRecoverableError(error)) throw error;

            const professores = getStorage();
            const index = professores.findIndex((item) => item.id === id);

            if (index === -1) {
                throw new Error("Professor nao encontrado.");
            }

            const atual = professores[index];
            const atualizado: ProfessorStorageItem = {
                ...atual,
                ...data,
                data_nascimento:
                    data.data_nascimento !== undefined
                        ? String(data.data_nascimento)
                        : atual.data_nascimento,
                curso: data.curso_nome || atual.curso,
                faculdade: data.faculdade_nome || atual.faculdade,
            };

            professores[index] = atualizado;
            saveStorage(professores);
            return atualizado;
        }
    },

    async deletar(id: string): Promise<void> {
        try {
            await api.delete(`/professores/${id}`);
        } catch (error) {
            if (!isRecoverableError(error)) throw error;

            const professores = getStorage();
            saveStorage(professores.filter((item) => item.id !== id));
        }
    },
};
