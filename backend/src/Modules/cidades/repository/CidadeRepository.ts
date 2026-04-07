import { db } from "../../../database/connection";

export class CidadeRepository {
    async listarCidades() {
        const cidades = await db("cidade").select("*")
        return cidades
    }
}