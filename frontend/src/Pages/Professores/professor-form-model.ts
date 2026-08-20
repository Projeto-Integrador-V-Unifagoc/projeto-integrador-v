export interface ProfessorFormData {
    nome: string;
    cpf: string;
    dataNascimento: string;
    curso_id: string;
    faculdade_id: string;
    cidade_id: string;
    uf: string;
    curso_nome: string;
    faculdade_nome: string;
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
    curso_id: "",
    faculdade_id: "",
    cidade_id: "",
    uf: "",
    curso_nome: "",
    faculdade_nome: "",
    cidade_nome: "",
    logradouro: "",
    bairro: "",
    numero: "",
    cep: "",
};
