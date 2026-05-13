import { Departamento, DepartamentoMapper } from "./Departamento"

export interface Curso {
    id: string
    codigo: string
    nome: string
    departamento: Departamento
}

export interface CursoCommand {
    id: string
    codigo: string
    nome: string
    departamento_id: string
}

export class CursoMapper {
    static toDomain(raw: any): Curso {
        return {
            id: raw.id,
            codigo: raw.codigo,
            nome: raw.nome,
            departamento: DepartamentoMapper.toDomain(raw)
        }
    }
}
