export interface DisciplinaSelecionada {
    id: string;
    nome: string;
}

export interface ProfessorFormData {
    nome: string;
    cpf: string;
    dataNascimento: string;
    disciplinaIds: string[];
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
    disciplinaIds: [],
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
