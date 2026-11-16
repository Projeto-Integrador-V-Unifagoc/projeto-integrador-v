import type { CursoDisciplinaResponse } from "../../models/curso-disciplina-model";

// Disciplina dentro de um curso: `id` é o da curso_disciplina.
export interface DisciplinaSelecionada {
    id: string;
    nome: string;
    cursoNome?: string;
}

export function rotuloDisciplina(disciplina: DisciplinaSelecionada) {
    return disciplina.cursoNome ? `${disciplina.nome} (${disciplina.cursoNome})` : disciplina.nome;
}

// Opções do campo "Disciplinas por curso": linhas ativas da matriz, agrupadas por curso.
export function opcoesDeDisciplinaPorCurso(cursoDisciplinas: CursoDisciplinaResponse[]): DisciplinaSelecionada[] {
    return cursoDisciplinas
        .filter((item) => item.ativo && item.disciplina.ativo)
        .map((item) => ({ id: item.id, nome: item.disciplina.nome, cursoNome: item.curso.nome }))
        .sort((a, b) => (a.cursoNome ?? "").localeCompare(b.cursoNome ?? "") || a.nome.localeCompare(b.nome));
}

export interface ProfessorFormData {
    nome: string;
    cpf: string;
    dataNascimento: string;
    cursoDisciplinaIds: string[];
    disciplinasSelecionadas: DisciplinaSelecionada[];
    faculdade_id: string;
    faculdadeSugerida: boolean;
    cidade_id: string;
    uf: string;
    cidade_nome: string;
    logradouro: string;
    bairro: string;
    numero: string;
    cep: string;
}

export const initialProfessorFormData: ProfessorFormData = {
    nome: "",
    cpf: "",
    dataNascimento: "",
    cursoDisciplinaIds: [],
    disciplinasSelecionadas: [],
    faculdade_id: "",
    faculdadeSugerida: true,
    cidade_id: "",
    uf: "",
    cidade_nome: "",
    logradouro: "",
    bairro: "",
    numero: "",
    cep: "",
};
