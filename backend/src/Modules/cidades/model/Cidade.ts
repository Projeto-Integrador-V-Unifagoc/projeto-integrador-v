export interface Cidade{
    id: string,
    nome: string,
    uf: string,
    ibge: string
}

export class CidadeMapper {
    static toDomain(data: any) {
    if (!data) return undefined;
    
    return {
        id: data.c_id || data.id,
        nome: data.c_nome || data.nome,
        ibge: data.c_ibge || data.ibge
    };
}
}