export interface StatusMatriculaDisciplina {
    id: string;
    codigo: string;
    nome: string;
    descricao?: string;
    ativo: boolean;
}

export interface StatusMatriculaDisciplinaCommand {
    id: string;
    codigo: string;
    nome: string;
    descricao?: string;
    ativo?: boolean;
}

export class DisciplinaMapper {
    static toDomain(raw: any): StatusMatriculaDisciplina {
        return {
            id: raw.id,
            codigo: raw.codigo,
            nome: raw.nome,
            descricao: raw.descricao,
            ativo: raw.ativo ?? true
        };
    }
}
