import { db } from "../../../database/connection";

export class CidadeRepository {
    async listarCidades(filtros?: { ibge?: string, nome?: string, uf?: string }) {
        const query = db('cidade')

        if(filtros?.ibge) {
            query.where("ibge", filtros.ibge)
        }

        if(filtros?.nome) {
            query.whereILike("nome", `%${filtros.nome}%`)
        }

        if(filtros?.uf) {
            query.whereILike("uf", `%${filtros.uf}%`)
        }

        return await query
        .select("*")
        .orderBy("nome", "asc")
        .limit(20)
    }

    async buscarCidadePorIbge(ibge: string) {
        const cidade = await db("cidade").where("ibge", ibge).first()
        return cidade
    }

    async listarEstados(search?: string) {
        const query = db("cidade")
            .distinct("uf")
            .orderBy("uf", "asc")

        if (search) {
            query.whereILike("uf", `%${search}%`)
        }

        return await query
    }
}
