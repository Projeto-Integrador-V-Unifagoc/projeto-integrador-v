export interface Disciplina {
    id: string
    codigo: string
    nome: string
    carga_horaria: number
    pre_requisito?: string
    area_conhecimento?: string
    ementa?: string
    carga_horaria_teorica?: number
    carga_horaria_pratica?: number
    carga_horaria_laboratorio?: number
    carga_horaria_extensao?: number
    observacoes?: string
    ativo: boolean
    competencias?: DisciplinaCompetencia[]
    quantidade_competencias?: number
    cadastro_completo?: boolean
    created_at?: string
    updated_at?: string
}

export interface DisciplinaCommand {
    id: string
    codigo: string
    nome: string
    pre_requisito?: string
    area_conhecimento?: string | null
    ementa?: string | null
    carga_horaria_teorica?: number | null
    carga_horaria_pratica?: number | null
    carga_horaria_laboratorio?: number | null
    carga_horaria_extensao?: number | null
    observacoes?: string | null
    carga_horaria: number
    ativo?: boolean
}

export type NivelCompetencia = "INTRODUZIR" | "DESENVOLVER" | "CONSOLIDAR";

export interface DisciplinaCompetenciaCommand {
    competencia_id: string
    nivel_esperado: NivelCompetencia
    obrigatoria: boolean
    ordem: number
}

export interface DisciplinaCompetencia {
    id: string
    competencia_id: string
    codigo: string
    nome: string
    descricao: string
    tipo: "GERAL" | "TECNICA" | "SOCIOEMOCIONAL"
    nivel_esperado: NivelCompetencia
    obrigatoria: boolean
    ordem: number
}

export class DisciplinaMapper {
    static toDomain(raw: any): Disciplina {
        return {
            id: raw.id,
            codigo: raw.codigo,
            nome: raw.nome,
            carga_horaria: raw.carga_horaria,
            pre_requisito: raw.pre_requisito ?? undefined,
            area_conhecimento: raw.area_conhecimento ?? undefined,
            ementa: raw.ementa ?? undefined,
            carga_horaria_teorica: raw.carga_horaria_teorica == null ? undefined : Number(raw.carga_horaria_teorica),
            carga_horaria_pratica: raw.carga_horaria_pratica == null ? undefined : Number(raw.carga_horaria_pratica),
            carga_horaria_laboratorio: raw.carga_horaria_laboratorio == null ? undefined : Number(raw.carga_horaria_laboratorio),
            carga_horaria_extensao: raw.carga_horaria_extensao == null ? undefined : Number(raw.carga_horaria_extensao),
            observacoes: raw.observacoes ?? undefined,
            ativo: raw.ativo,
            quantidade_competencias: raw.quantidade_competencias === undefined ? undefined : Number(raw.quantidade_competencias),
            created_at: raw.created_at,
            updated_at: raw.updated_at
        }
    }
}
