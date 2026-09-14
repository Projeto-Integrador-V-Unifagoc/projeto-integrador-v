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

/** Linha crua do banco: colunas sem prefixo (consulta direta) ou prefixadas com "p_" (join). */
interface RawPessoa {
    p_id?: string; id?: string;
    p_cpf?: string; cpf?: string;
    p_nome?: string; nome?: string;
    p_data_nascimento?: string; data_nascimento?: string;
    p_logradouro?: string; logradouro?: string;
    p_numero?: number; numero?: number;
    p_bairro?: string; bairro?: string;
    p_estado?: string; estado?: string;
    p_cep?: string; cep?: string;
}

export class PessoaMapper {
    static toDomain(raw: RawPessoa): Pessoa {
        return {
            id: (raw.p_id || raw.id) as string,
            cpf: (raw.p_cpf || raw.cpf) as string,
            nome: (raw.p_nome || raw.nome) as string,
            dataNascimento: (raw.p_data_nascimento || raw.data_nascimento) as string,
            logradouro: (raw.p_logradouro || raw.logradouro) as string,
            numero: (raw.p_numero || raw.numero) as number,
            bairro: (raw.p_bairro || raw.bairro) as string,
            estado: (raw.p_estado || raw.estado) as string,
            cep: (raw.p_cep || raw.cep) as string,
            cidade: CidadeMapper.toDomain(raw) as Cidade
        }
    }
}
