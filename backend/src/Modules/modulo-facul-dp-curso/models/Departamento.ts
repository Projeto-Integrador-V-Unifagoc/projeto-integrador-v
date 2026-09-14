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

/** Linha crua do banco. Alguns chamadores (ex.: AlunoMapper) só preenchem um subconjunto. */
interface RawDepartamento {
    departamento_id?: string;
    departamento_codigo?: string;
    departamento_nome?: string;
    faculdade_id?: string;
    faculdade_nome?: string;
    logradouro?: string;
    numero?: number;
    bairro?: string;
    cep?: string;
    cidade_id?: string;
    cidade_ibge?: string;
    cidade_nome?: string;
    cidade_uf?: string;
}

export class DepartamentoMapper {
    static toDomain(raw: RawDepartamento): Departamento {
        return {
            id: raw.departamento_id as string,
            codigo: raw.departamento_codigo as string,
            nome: raw.departamento_nome as string,
            faculdade: FaculdadeMapper.toDomain(raw)
        }
    }
}