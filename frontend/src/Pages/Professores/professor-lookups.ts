import { api } from "../../lib/axios";
import type { SelectOption } from "../../components/SearchableSelect/SearchableSelect";

type CursoApiResponse = {
    id: string;
    nome: string;
    codigo?: string;
};

type FaculdadeApiResponse = {
    id: string;
    nome: string;
};

type CidadeApiResponse = {
    id: string;
    ibge?: string | number;
    nome: string;
    uf: string;
};

type EstadoApiResponse = {
    uf: string;
};

function matches(query: string, ...values: Array<string | undefined>) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export async function buscarCursosOptions(query: string): Promise<SelectOption[]> {
    const response = await api.get<CursoApiResponse[]>("/cursos");

    return response.data
        .filter((curso) => matches(query, curso.nome, curso.codigo))
        .map((curso) => ({
            id: curso.id,
            label: curso.nome,
            sublabel: curso.codigo,
        }));
}

export async function buscarFaculdadesOptions(query: string): Promise<SelectOption[]> {
    const response = await api.get<FaculdadeApiResponse[]>("/faculdades");

    return response.data
        .filter((faculdade) => matches(query, faculdade.nome))
        .map((faculdade) => ({
            id: faculdade.id,
            label: faculdade.nome,
        }));
}

export async function buscarEstadosOptions(query: string): Promise<SelectOption[]> {
    const response = await api.get<EstadoApiResponse[]>("/estados", {
        params: { search: query },
    });

    return response.data.map((estado) => ({
        id: estado.uf,
        label: estado.uf,
        sublabel: estado.uf,
    }));
}

export async function buscarCidadesOptions(query: string, uf?: string): Promise<SelectOption[]> {
    const response = await api.get<CidadeApiResponse[]>("/cidades", {
        params: {
            nome: query,
            uf,
        },
    });

    return response.data.map((cidade) => ({
        id: String(cidade.ibge ?? cidade.id),
        label: cidade.nome,
        sublabel: cidade.uf,
    }));
}
