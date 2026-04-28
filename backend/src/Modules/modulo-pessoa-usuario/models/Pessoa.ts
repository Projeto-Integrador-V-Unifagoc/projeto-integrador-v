import { Cidade, CidadeMapper } from "../../cidades/model/Cidade"

export interface Pessoa {
    id: string
    cpf: string
    nome: string
    dataNascimento: string
    logradouro: string
    numero: number
    bairro: string
    cidade: Cidade
    estado: string
    cep: string
}
export interface PessoaCommand {
    id?: string
    cpf: string
    nome: string
    data_nascimento: string
    logradouro: string
    numero: number
    bairro: string
    cidade_id: string
    estado: string
    cep: string
}

export class PessoaMapper {
    static toDomain(raw: any): Pessoa {
        return {
            id: raw.p_id || raw.id, 
            cpf: raw.p_cpf || raw.cpf,
            nome: raw.p_nome || raw.nome,
            dataNascimento: raw.p_data_nascimento || raw.data_nascimento,
            logradouro: raw.p_logradouro || raw.logradouro,
            numero: raw.p_numero || raw.numero,
            bairro: raw.p_bairro || raw.bairro,
            estado: raw.p_estado || raw.estado,
            cep: raw.p_cep || raw.cep,
            cidade: CidadeMapper.toDomain(raw) as Cidade
        }
    }
}
