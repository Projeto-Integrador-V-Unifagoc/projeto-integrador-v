export interface StatusMatriculaDisciplina {
    id: string;
    descricao: string;
}

export interface StatusMatriculaDisciplinaCommand {
    id: string;
    descricao: string;
}

export class DisciplinaMapper {
    static toDomain(raw: any): StatusMatriculaDisciplina {
        return {
            id: raw.id,
            descricao: raw.descricao,
        };
    }
}
