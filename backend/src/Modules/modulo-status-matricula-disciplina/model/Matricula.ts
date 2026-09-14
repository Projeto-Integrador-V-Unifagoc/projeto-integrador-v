export interface StatusMatriculaCurso {
    id: string;
    descricao: string;
}

export interface StatusMatriculaCursoCommand {
    id: string;
    descricao: string;
}

interface RawStatusMatriculaCurso {
    id?: string;
    descricao?: string;
}

export class MatriculaMapper {
    static toDomain(raw: RawStatusMatriculaCurso): StatusMatriculaCurso {
        return {
            id: raw.id as string,
            descricao: raw.descricao as string,
        };
    }
}
