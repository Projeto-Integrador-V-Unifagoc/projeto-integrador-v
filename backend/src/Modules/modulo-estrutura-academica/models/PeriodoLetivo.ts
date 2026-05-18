export interface PeriodoLetivo {
    id: string
    codigo: string
    ano: number
    semestre: number
    data_inicio: string
    data_fim: string
    ativo: boolean
    status: string
    created_at?: string
    updated_at?: string
}

export interface PeriodoLetivoCommand {
    id: string
    codigo: string
    ano: number
    semestre: number
    data_inicio: string
    data_fim: string
    ativo?: boolean
    status: string
}

export class PeriodoLetivoMapper {
    static toDomain(raw: any): PeriodoLetivo {
        return {
            id: raw.id,
            codigo: raw.codigo,
            ano: raw.ano,
            semestre: raw.semestre,
            data_inicio: raw.data_inicio,
            data_fim: raw.data_fim,
            ativo: raw.ativo,
            status: raw.status,
            created_at: raw.created_at,
            updated_at: raw.updated_at
        };
    }
}
