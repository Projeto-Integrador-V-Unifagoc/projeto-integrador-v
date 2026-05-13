export interface StatusMatriculaCurso {
    id: string;
    codigo: string;
    nome: string;
    descricao?: string;
    ativo: boolean;
}

export interface StatusMatriculaCursoCommand {
    id: string;
    codigo: string;
    nome: string;
    descricao?: string;
    ativo?: boolean;
}

export class MatriculaMapper {
    static toDomain(raw: any): StatusMatriculaCurso {
        return {
            id: raw.id,
            codigo: raw.codigo,
            nome: raw.nome,
            descricao: raw.descricao,
            ativo: raw.ativo ?? true
        };
    }
}
