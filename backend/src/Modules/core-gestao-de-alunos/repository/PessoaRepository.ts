import { db } from "../../../database/connection";
import { Pessoa } from "../models/Pessoa";

export class PessoaRepository {
    async criarPessoa(data: Pessoa) {
        const pessoa = await db("pessoas")
            .insert(data)
            .returning('*')

        return pessoa[0]
    }
}