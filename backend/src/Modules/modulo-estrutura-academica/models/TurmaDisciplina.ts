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

export class TurmaDisciplinaMapper {
    static toDomain(raw: any): TurmaDisciplina {
        return {
            id: raw.id,
            status: raw.status,
            turma: {
                id: raw.turma_id,
                sigla: raw.turma_sigla,
                descricao: raw.turma_descricao
            },
            curso_disciplina: {
                id: raw.curso_disciplina_id,
                periodo_ideal: raw.periodo_ideal ?? undefined,
                obrigatoria: raw.obrigatoria,
                carga_horaria: raw.curso_disciplina_carga_horaria,
                disciplina: {
                    id: raw.disciplina_id,
                    codigo: raw.disciplina_codigo,
                    nome: raw.disciplina_nome,
                    pre_requisito: raw.disciplina_pre_requisito ?? undefined,
                    carga_horaria: raw.disciplina_carga_horaria
                }
            },
            professor: {
                id: raw.professor_id,
                nome: raw.professor_nome
            },
            created_at: raw.created_at,
            updated_at: raw.updated_at
        };
    }
}
