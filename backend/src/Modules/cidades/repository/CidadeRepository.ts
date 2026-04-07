import { db } from "../../../database/connection";

export class CidadeRepository {
    async listarCidades(filtros?: { ibge?: string }) {
        const query = db('cidade')

        if(filtros?.ibge) {
            query.where("ibge", filtros.ibge)
        }
        return await query.select("*")
    }
}