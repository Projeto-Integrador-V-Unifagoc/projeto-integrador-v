import { Faculdade, FaculdadeMapper } from "./Faculdade"

export interface Departamento{
    id: string,
    codigo: string,
    nome: string,
    faculdade: Faculdade
}

export interface DepartamentoCommand{
    id: string,
    codigo: string,
    nome: string,
    faculdade_id: string
}

export class DepartamentoMapper {
    static toDomain(raw: any): Departamento {
        return {
            id: raw.departamento_id,
            codigo: raw.departamento_codigo,
            nome: raw.departamento_nome,
            faculdade: FaculdadeMapper.toDomain(raw)
        }
    }
}