import { db } from "../../../database/connection";

export class CidadeRepository {
    async listarCidades(filtros?: { ibge?: string, nome?: string }) {
        const query = db('cidade')

        if(filtros?.ibge) {
            query.where("ibge", filtros.ibge)
        }

        if(filtros?.nome) {
            query.whereILike("nome", `%${filtros.nome}%`)
        }

        return await query
        .select("*")
        .limit(20)
    }

    async buscarCidadePorIbge(ibge: string) {
        const cidade = await db("cidade").where("ibge", ibge).first()
        return cidade
    }
}