export interface Professor {
    id: string
    nome: string
    curso?: {
        id: string
        nome: string
    }
}

interface RawProfessor {
    id?: string;
    nome?: string;
    curso_id?: string;
    curso_nome?: string;
}

export class ProfessorMapper {
    static toDomain(raw: RawProfessor): Professor {
        return {
            id: raw.id as string,
            nome: raw.nome as string,
            curso: raw.curso_id ? {
                id: raw.curso_id,
                nome: raw.curso_nome
            } : undefined
        };
    }
}
