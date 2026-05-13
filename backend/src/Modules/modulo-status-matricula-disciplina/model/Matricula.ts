export interface StatusMatriculaCurso {
    id: string;
    descricao: string;
}

export interface StatusMatriculaCursoCommand {
    id: string;
    descricao: string;
}

export class MatriculaMapper {
    static toDomain(raw: any): StatusMatriculaCurso {
        return {
            id: raw.id,
            descricao: raw.descricao,
        };
    }
}
