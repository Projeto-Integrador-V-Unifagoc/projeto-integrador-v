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
    created_at?: string
    updated_at?: string
}

export interface TurmaCommand {
    id: string
    periodo_letivo_id: string
    curso_id: string
    periodo_curricular: number
    descricao: string
    sigla: string
    capacidade_alunos: number
    turno: string
    status: string
}

interface RawTurma {
    id?: string;
    periodo_curricular?: number;
    descricao?: string;
    sigla?: string;
    capacidade_alunos?: number;
    turno?: string;
    status?: string;
    periodo_letivo_id?: string;
    periodo_letivo_codigo?: string;
    periodo_letivo_ano?: number;
    periodo_letivo_semestre?: number;
    curso_id?: string;
    curso_codigo?: string;
    curso_nome?: string;
    created_at?: string;
    updated_at?: string;
}

export class TurmaMapper {
    static toDomain(raw: RawTurma): Turma {
        return {
            id: raw.id as string,
            periodo_curricular: raw.periodo_curricular as number,
            descricao: raw.descricao as string,
            sigla: raw.sigla as string,
            capacidade_alunos: raw.capacidade_alunos as number,
            turno: raw.turno as string,
            status: raw.status as string,
            periodo_letivo: {
                id: raw.periodo_letivo_id as string,
                codigo: raw.periodo_letivo_codigo as string,
                ano: raw.periodo_letivo_ano as number,
                semestre: raw.periodo_letivo_semestre as number
            },
            curso: {
                id: raw.curso_id as string,
                codigo: raw.curso_codigo as string,
                nome: raw.curso_nome as string
            },
            created_at: raw.created_at,
            updated_at: raw.updated_at
        };
    }
}
