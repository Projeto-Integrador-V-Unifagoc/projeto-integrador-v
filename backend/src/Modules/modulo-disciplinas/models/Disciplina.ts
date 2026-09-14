export interface Disciplina {
    id: string
    codigo: string
    nome: string
    carga_horaria: number
    pre_requisito?: string
    ativo: boolean
    created_at?: string
    updated_at?: string
}

export interface DisciplinaCommand {
    id: string
    codigo: string
    nome: string
    pre_requisito?: string
    carga_horaria: number
    ativo?: boolean
}

interface RawDisciplina {
    id?: string;
    codigo?: string;
    nome?: string;
    carga_horaria?: number;
    pre_requisito?: string;
    ativo?: boolean;
    created_at?: string;
    updated_at?: string;
}

export class DisciplinaMapper {
    static toDomain(raw: RawDisciplina): Disciplina {
        return {
            id: raw.id as string,
            codigo: raw.codigo as string,
            nome: raw.nome as string,
            carga_horaria: raw.carga_horaria as number,
            pre_requisito: raw.pre_requisito ?? undefined,
            ativo: raw.ativo as boolean,
            created_at: raw.created_at,
            updated_at: raw.updated_at
        }
    }
}
