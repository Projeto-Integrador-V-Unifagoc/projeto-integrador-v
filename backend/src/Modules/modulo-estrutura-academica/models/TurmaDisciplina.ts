export interface TurmaDisciplina {
    id: string
    status: string
    turma: {
        id: string
        sigla: string
        descricao: string
    }
    curso_disciplina: {
        id: string
        periodo_ideal?: number
        obrigatoria: boolean
        carga_horaria: number
        disciplina: {
            id: string
            codigo: string
            nome: string
            pre_requisito?: string
            carga_horaria: number
        }
    }
    professor: {
        id: string
        nome: string
    }
    created_at?: string
    updated_at?: string
}

export interface TurmaDisciplinaCommand {
    id: string
    turma_id: string
    curso_disciplina_id: string
    professor_id: string
    status: string
}

interface RawTurmaDisciplina {
    id?: string;
    status?: string;
    turma_id?: string;
    turma_sigla?: string;
    turma_descricao?: string;
    curso_disciplina_id?: string;
    periodo_ideal?: number;
    obrigatoria?: boolean;
    curso_disciplina_carga_horaria?: number;
    disciplina_id?: string;
    disciplina_codigo?: string;
    disciplina_nome?: string;
    disciplina_pre_requisito?: string;
    disciplina_carga_horaria?: number;
    professor_id?: string;
    professor_nome?: string;
    created_at?: string;
    updated_at?: string;
}

export class TurmaDisciplinaMapper {
    static toDomain(raw: RawTurmaDisciplina): TurmaDisciplina {
        return {
            id: raw.id as string,
            status: raw.status as string,
            turma: {
                id: raw.turma_id as string,
                sigla: raw.turma_sigla as string,
                descricao: raw.turma_descricao as string
            },
            curso_disciplina: {
                id: raw.curso_disciplina_id as string,
                periodo_ideal: raw.periodo_ideal ?? undefined,
                obrigatoria: raw.obrigatoria as boolean,
                carga_horaria: raw.curso_disciplina_carga_horaria as number,
                disciplina: {
                    id: raw.disciplina_id as string,
                    codigo: raw.disciplina_codigo as string,
                    nome: raw.disciplina_nome as string,
                    pre_requisito: raw.disciplina_pre_requisito ?? undefined,
                    carga_horaria: raw.disciplina_carga_horaria as number
                }
            },
            professor: {
                id: raw.professor_id as string,
                nome: raw.professor_nome as string
            },
            created_at: raw.created_at,
            updated_at: raw.updated_at
        };
    }
}
