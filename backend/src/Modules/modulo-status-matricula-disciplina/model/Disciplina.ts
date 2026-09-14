export interface StatusMatriculaDisciplina {
    id: string;
    descricao: string;
}

export interface StatusMatriculaDisciplinaCommand {
    id: string;
    descricao: string;
}

interface RawStatusMatriculaDisciplina {
    id?: string;
    descricao?: string;
}

export class DisciplinaMapper {
    static toDomain(raw: RawStatusMatriculaDisciplina): StatusMatriculaDisciplina {
        return {
            id: raw.id as string,
            descricao: raw.descricao as string,
        };
    }
}
