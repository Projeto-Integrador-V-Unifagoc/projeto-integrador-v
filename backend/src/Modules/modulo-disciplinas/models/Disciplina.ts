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

export class DisciplinaMapper {
    static toDomain(raw: any): Disciplina {
        return {
            id: raw.id,
            codigo: raw.codigo,
            nome: raw.nome,
            carga_horaria: raw.carga_horaria,
            pre_requisito: raw.pre_requisito ?? undefined,
            ativo: raw.ativo,
            created_at: raw.created_at,
            updated_at: raw.updated_at
        }
    }
}
