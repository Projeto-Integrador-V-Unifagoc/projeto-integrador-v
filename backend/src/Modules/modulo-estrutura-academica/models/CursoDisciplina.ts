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

interface RawCursoDisciplina {
    id?: string;
    periodo_ideal?: number;
    obrigatoria?: boolean;
    carga_horaria?: number;
    ativo?: boolean;
    curso_id?: string;
    curso_codigo?: string;
    curso_nome?: string;
    disciplina_id?: string;
    disciplina_codigo?: string;
    disciplina_nome?: string;
    disciplina_pre_requisito?: string;
    disciplina_carga_horaria?: number;
    disciplina_ativo?: boolean;
    created_at?: string;
    updated_at?: string;
}

export class CursoDisciplinaMapper {
    static toDomain(raw: RawCursoDisciplina): CursoDisciplina {
        return {
            id: raw.id as string,
            periodo_ideal: raw.periodo_ideal ?? undefined,
            obrigatoria: raw.obrigatoria as boolean,
            carga_horaria: raw.carga_horaria as number,
            ativo: raw.ativo as boolean,
            curso: {
                id: raw.curso_id as string,
                codigo: raw.curso_codigo as string,
                nome: raw.curso_nome as string
            },
            disciplina: {
                id: raw.disciplina_id as string,
                codigo: raw.disciplina_codigo as string,
                nome: raw.disciplina_nome as string,
                pre_requisito: raw.disciplina_pre_requisito ?? undefined,
                carga_horaria: raw.disciplina_carga_horaria as number,
                ativo: raw.disciplina_ativo as boolean
            },
            created_at: raw.created_at,
            updated_at: raw.updated_at
        };
    }
}
