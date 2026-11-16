export interface Professor {
    id: string
    nome: string
    cpf: string
    disciplinas: DisciplinaDoProfessor[]
    faculdade: string
    faculdade_id?: string
    ativo: boolean
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
    cpf: string
    data_nascimento: string | Date
    logradouro: string
    numero: string
    bairro: string
    cidade_id: string
    estado: string
    cep: string
    cursoDisciplinaIds: string[]
    faculdade_id?: string
}

export interface AtualizarProfessorDTO {
    nome?: string
    cpf?: string
    data_nascimento?: string | Date
    logradouro?: string
    numero?: string
    bairro?: string
    cidade_id?: string
    estado?: string
    cep?: string
    cursoDisciplinaIds?: string[]
    faculdade_id?: string
}

// Vínculo do professor com uma disciplina dentro de um curso: `id` é o da curso_disciplina.
export interface DisciplinaDoProfessor {
    id: string
    disciplinaId: string
    nome: string
    cursoId: string
    cursoNome: string
}

export interface ProfessorOpcao {
    id: string
    nome: string
    disciplinas: DisciplinaDoProfessor[]
}
