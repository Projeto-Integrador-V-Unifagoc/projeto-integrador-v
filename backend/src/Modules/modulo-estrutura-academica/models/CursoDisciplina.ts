export interface CursoDisciplina {
    id: string
    periodo_ideal?: number
    obrigatoria: boolean
    carga_horaria: number
    ativo: boolean
    curso: {
        id: string
        codigo: string
        nome: string
    }
    disciplina: {
        id: string
        codigo: string
        nome: string
        pre_requisito?: string
        carga_horaria: number
        ativo: boolean
    }
    created_at?: string
    updated_at?: string
}

export interface CursoDisciplinaCommand {
    id: string
    curso_id: string
    disciplina_id: string
    periodo_ideal?: number
    obrigatoria?: boolean
    carga_horaria: number
    ativo?: boolean
}

export class CursoDisciplinaMapper {
    static toDomain(raw: any): CursoDisciplina {
        return {
            id: raw.id,
            periodo_ideal: raw.periodo_ideal ?? undefined,
            obrigatoria: raw.obrigatoria,
            carga_horaria: raw.carga_horaria,
            ativo: raw.ativo,
            curso: {
                id: raw.curso_id,
                codigo: raw.curso_codigo,
                nome: raw.curso_nome
            },
            disciplina: {
                id: raw.disciplina_id,
                codigo: raw.disciplina_codigo,
                nome: raw.disciplina_nome,
                pre_requisito: raw.disciplina_pre_requisito ?? undefined,
                carga_horaria: raw.disciplina_carga_horaria,
                ativo: raw.disciplina_ativo
            },
            created_at: raw.created_at,
            updated_at: raw.updated_at
        };
    }
}
