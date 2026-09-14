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

/** Linha crua do banco. Alguns chamadores (ex.: AlunoMapper) só preenchem um subconjunto. */
interface RawCurso {
    id?: string;
    codigo?: string;
    nome?: string;
    departamento_id?: string;
    departamento_nome?: string;
    departamento_codigo?: string;
    faculdade_id?: string;
    faculdade_nome?: string;
    logradouro?: string;
    numero?: number;
    bairro?: string;
    cep?: string;
    cidade_id?: string;
    cidade_nome?: string;
    cidade_uf?: string;
    cidade_ibge?: string;
}

export class CursoMapper {
    static toDomain(raw: RawCurso): Curso {
        return {
            id: raw.id as string,
            codigo: raw.codigo as string,
            nome: raw.nome as string,
            departamento: DepartamentoMapper.toDomain(raw)
        }
    }
}
