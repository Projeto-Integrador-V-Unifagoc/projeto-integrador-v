export interface Disciplina {
    id: string
    codigo: string
    nome: string
    carga_horaria: number
    pre_requisito?: string
    curso: {
        id: string
        codigo: string
        nome: string
    }
}

export interface DisciplinaCommand {
    id: string
    codigo: string
    nome: string
    curso_id: string
    pre_requisito?: string
    carga_horaria: number
}

export class DisciplinaMapper {
    static toDomain(raw: any): Disciplina {
        return {
            id: raw.id,
            codigo: raw.codigo,
            nome: raw.nome,
            carga_horaria: raw.carga_horaria,
            pre_requisito: raw.pre_requisito ?? undefined,
            curso: {
                id: raw.curso_id,
                codigo: raw.curso_codigo,
                nome: raw.curso_nome
            }
        }
    }
}
