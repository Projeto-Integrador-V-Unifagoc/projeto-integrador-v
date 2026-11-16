import { Departamento, DepartamentoMapper } from "./Departamento"

export interface Curso {
    id: string
    codigo: string
    nome: string
    descricao?: string | null
    grau_academico?: string | null
    modalidade?: string | null
    duracao_periodos?: number | null
    carga_horaria_minima?: number | null
    situacao_academica: string
    ato_regulatorio?: string | null
    observacoes_regulatorias?: string | null
    departamento: Departamento
}

export interface CursoCommand {
    id: string
    codigo: string
    nome: string
    departamento_id: string
    descricao?: string | null
    grau_academico?: string | null
    modalidade?: string | null
    duracao_periodos?: number | null
    carga_horaria_minima?: number | null
    situacao_academica?: string
    ato_regulatorio?: string | null
    observacoes_regulatorias?: string | null
}

export class CursoMapper {
    static toDomain(raw: any): Curso {
        return {
            id: raw.id,
            codigo: raw.codigo,
            nome: raw.nome,
            descricao: raw.descricao ?? null,
            grau_academico: raw.grau_academico ?? null,
            modalidade: raw.modalidade ?? null,
            duracao_periodos: raw.duracao_periodos === null || raw.duracao_periodos === undefined ? null : Number(raw.duracao_periodos),
            carga_horaria_minima: raw.carga_horaria_minima === null || raw.carga_horaria_minima === undefined ? null : Number(raw.carga_horaria_minima),
            situacao_academica: raw.situacao_academica ?? "ATIVO",
            ato_regulatorio: raw.ato_regulatorio ?? null,
            observacoes_regulatorias: raw.observacoes_regulatorias ?? null,
            departamento: DepartamentoMapper.toDomain(raw)
        }
    }
}
