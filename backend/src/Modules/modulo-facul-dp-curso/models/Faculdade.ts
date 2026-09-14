import { Cidade } from "../../cidades/model/Cidade";

export interface Faculdade{
    id: string,
    nome: string,
    cidade: Cidade,
    logradouro: string,
    numero: number,
    bairro: string,
    cep: string
}

export interface FaculdadeCommand{
    id: string,
    nome: string,
    cidade_id: string,
    logradouro: string,
    numero: number,
    bairro: string,
    cep: string
}

/** Linha crua do banco. Alguns chamadores (ex.: AlunoMapper) só preenchem um subconjunto. */
interface RawFaculdade {
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

export class FaculdadeMapper {
    static toDomain(raw: RawFaculdade): Faculdade {
        return {
            id: raw.faculdade_id as string,
            nome: raw.faculdade_nome as string,
            logradouro: raw.logradouro as string,
            numero: raw.numero as number,
            bairro: raw.bairro as string,
            cep: raw.cep as string,
            cidade: {
                id: raw.cidade_id as string,
                ibge: raw.cidade_ibge as string,
                nome: raw.cidade_nome as string,
                uf: raw.cidade_uf as string
            }
        };
    }
}