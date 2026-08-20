export interface Curso {
    id: string;
    nome: string;
    codigo: string;
    departamento_id: string;
}

export interface Faculdade {
    id: string;
    nome: string;
    cidade_id: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cep: string;
}

export interface Cidade {
    id: string;
    nome: string;
    uf: string;  
}