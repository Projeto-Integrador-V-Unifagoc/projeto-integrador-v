export interface Professor {
    id: string
    nome: string
    email: string
    cpf: string
    curso: string
    curso_id?: string
    faculdade: string
    faculdade_id: string
    cidade?: string
    data_nascimento?: string
    logradouro?: string
    numero?: string
    bairro?: string
    cidade_id?: string
    estado?: string
    cep?: string
}

export interface CriarProfessorDTO {
    nome: string
    email: string
    senha: string
    cpf: string
    data_nascimento: string | Date
    logradouro: string
    numero: string
    bairro: string
    cidade_id: string
    estado: string
    cep: string
    curso_id: string
    faculdade_id: string
    curso_nome?: string
    faculdade_nome?: string
    cidade_nome?: string
    uf_nome?: string
}

export interface AtualizarProfessorDTO {
    nome?: string
    email?: string
    senha?: string
    cpf?: string
    data_nascimento?: string | Date
    logradouro?: string
    numero?: string
    bairro?: string
    cidade_id?: string
    estado?: string
    cep?: string
    curso_id?: string
    faculdade_id?: string
    curso_nome?: string
    faculdade_nome?: string
    cidade_nome?: string
    uf_nome?: string
}
