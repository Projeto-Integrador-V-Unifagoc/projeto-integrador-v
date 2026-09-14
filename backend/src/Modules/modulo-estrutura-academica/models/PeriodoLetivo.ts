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

interface RawPeriodoLetivo {
    id?: string;
    codigo?: string;
    ano?: number;
    semestre?: number;
    data_inicio?: string;
    data_fim?: string;
    ativo?: boolean;
    status?: string;
    created_at?: string;
    updated_at?: string;
}

export class PeriodoLetivoMapper {
    static toDomain(raw: RawPeriodoLetivo): PeriodoLetivo {
        return {
            id: raw.id as string,
            codigo: raw.codigo as string,
            ano: raw.ano as number,
            semestre: raw.semestre as number,
            data_inicio: raw.data_inicio as string,
            data_fim: raw.data_fim as string,
            ativo: raw.ativo as boolean,
            status: raw.status as string,
            created_at: raw.created_at,
            updated_at: raw.updated_at
        };
    }
}
