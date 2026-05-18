export interface Professor {
    id: string
    nome: string
    curso?: {
        id: string
        nome: string
    }
}

export class ProfessorMapper {
    static toDomain(raw: any): Professor {
        return {
            id: raw.id,
            nome: raw.nome,
            curso: raw.curso_id ? {
                id: raw.curso_id,
                nome: raw.curso_nome
            } : undefined
        };
    }
}
