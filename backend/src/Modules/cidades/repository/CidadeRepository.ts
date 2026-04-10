import { db } from "../../../database/connection";

export class CidadeRepository {
    async listarCidades(filtros?: { ibge?: string }) {
        const query = db('cidade')

        if(filtros?.ibge) {
            query.where("ibge", filtros.ibge)
        }
        return await query.select("*")
    }

    async buscarCidadePorIbge(ibge: string) {
        const cidade = await db("cidade").where("ibge", ibge).first()
        return cidade
    }
}