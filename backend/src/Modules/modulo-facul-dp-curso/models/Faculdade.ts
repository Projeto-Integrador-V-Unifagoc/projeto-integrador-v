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

export class FaculdadeMapper {
    static toDomain(raw: any): Faculdade {
        return {
            id: raw.faculdade_id,
            nome: raw.faculdade_nome,
            logradouro: raw.logradouro,
            numero: raw.numero,
            bairro: raw.bairro,
            cep: raw.cep,
            cidade: {
                id: raw.cidade_id,
                ibge: raw.cidade_ibge,
                nome: raw.cidade_nome,
                uf: raw.cidade_uf
            }
        };
    }
}