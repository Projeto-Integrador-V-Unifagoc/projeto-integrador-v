import { db } from "../../../database/connection";

export class CidadeRepository {
    async listarCidades(filtros?: { ibge?: string }) {
        const query = db('cidade')

        if(filtros?.ibge) {
            query.where("ibge", filtros.ibge)
        }
        return await query
        .select("*")
        .limit(10)
    }

    async buscarCidadePorIbge(ibge: string) {
        const cidade = await db("cidade").where("ibge", ibge).first()
        return cidade
    }
}