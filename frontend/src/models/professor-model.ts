export interface Professor {
    id: string
    nome: string
    email: string
    cpf: string
    curso: string
    faculdade_id: string
}

export interface CriarProfessorDTO{
    nome: string
    email: string
    senha: string
    cpf: string
    curso: string
    faculdade: string
}

export interface AtualizarProfessorDTO{
    nome?: string
    email?: string
    senha?: string
    cpf?: string
    curso?: string
    faculdade_id?: string
}