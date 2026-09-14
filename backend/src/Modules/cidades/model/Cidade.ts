export interface Cidade{
    id: string,
    nome: string,
    uf: string,
    ibge: string
}

/** Linha crua vinda do banco: colunas sem prefixo (consulta direta) ou prefixadas com "c_" (join). */
interface RawCidade {
    c_id?: string; id?: string;
    c_nome?: string; nome?: string;
    c_uf?: string; uf?: string;
    c_ibge?: string; ibge?: string;
}

export class CidadeMapper {
    static toDomain(data: RawCidade | undefined | null): Cidade | undefined {
    if (!data) return undefined;

    return {
        id: (data.c_id || data.id) as string,
        nome: (data.c_nome || data.nome) as string,
        uf: (data.c_uf || data.uf) as string,
        ibge: (data.c_ibge || data.ibge) as string
    };
}
}