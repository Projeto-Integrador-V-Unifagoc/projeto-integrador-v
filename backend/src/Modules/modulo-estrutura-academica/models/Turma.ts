export interface Turma {
    id: string
    periodo_curricular: number
    descricao: string
    sigla: string
    capacidade_alunos: number
    turno: string
    status: string
    periodo_letivo: {
        id: string
        codigo: string
        ano: number
        semestre: number
    }
    curso: {
        id: string
        codigo: string
        nome: string
    }
    matriz_curricular: {
        id: string
        codigo: string
        versao: string
        status: string
    }
    created_at?: string
    updated_at?: string
}

export interface TurmaCommand {
    id: string
    periodo_letivo_id: string
    curso_id: string
    matriz_curricular_id: string
    periodo_curricular: number
    descricao: string
    sigla: string
    capacidade_alunos: number
    turno: string
    status: string
}

export class TurmaMapper {
    static toDomain(raw: any): Turma {
        return {
            id: raw.id,
            periodo_curricular: raw.periodo_curricular,
            descricao: raw.descricao,
            sigla: raw.sigla,
            capacidade_alunos: raw.capacidade_alunos,
            turno: raw.turno,
            status: raw.status,
            periodo_letivo: {
                id: raw.periodo_letivo_id,
                codigo: raw.periodo_letivo_codigo,
                ano: raw.periodo_letivo_ano,
                semestre: raw.periodo_letivo_semestre
            },
            curso: {
                id: raw.curso_id,
                codigo: raw.curso_codigo,
                nome: raw.curso_nome
            },
            matriz_curricular: {
                id: raw.matriz_curricular_id,
                codigo: raw.matriz_codigo,
                versao: raw.matriz_versao,
                status: raw.matriz_status
            },
            created_at: raw.created_at,
            updated_at: raw.updated_at
        };
    }
}
