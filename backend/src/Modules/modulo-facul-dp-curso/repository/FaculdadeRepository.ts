import { db } from "../../../database/connection";
import { Faculdade } from "../models/Faculdade";
import { FaculdadeMapper } from "../models/Faculdade";

export class FaculdadeRepository {
    async criarFaculdade(data: any ){
        const faculdade = await db("faculdade")
            .insert(data)
            .returning("*")

        return faculdade[0]
    }

    async listarFaculdades(): Promise<Faculdade[]> {
        const rows = await db('faculdade')
            .join('cidade', 'faculdade.cidade_id', '=', 'cidade.ibge') 
            .select(
                'faculdade.id as faculdade_id',
                'faculdade.nome as faculdade_nome',
                'faculdade.logradouro',
                'faculdade.numero',
                'faculdade.bairro',
                'faculdade.cep',
                'cidade.id as cidade_id',
                'cidade.ibge as cidade_ibge',
                'cidade.nome as cidade_nome',
                'cidade.uf as cidade_uf'
            );

        return rows.map(row => FaculdadeMapper.toDomain(row));
    }

    async buscarFaculdadePorId(id: string): Promise<Faculdade | null> {
        const row = await db('faculdade')
            .join('cidade', 'faculdade.cidade_id', '=', 'cidade.ibge')
            .where('faculdade.id', id)
            .select(
                'faculdade.id as faculdade_id',
                'faculdade.nome as faculdade_nome',
                'faculdade.logradouro',
                'faculdade.numero',
                'faculdade.bairro',
                'faculdade.cep',
                'cidade.id as cidade_id',
                'cidade.ibge as cidade_ibge',
                'cidade.nome as cidade_nome',
                'cidade.uf as cidade_uf'
            )
            .first();

        return row ? FaculdadeMapper.toDomain(row) : null;
    }

}