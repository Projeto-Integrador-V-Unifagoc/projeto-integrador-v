import { db } from "../../../database/connection"
import { PessoaCommand } from "../models/Pessoa";

export class PessoaRepository {
    async criarPessoa(pessoa: PessoaCommand, transaction?: any) {
    const query = transaction || db; // Usa a transação se existir, senão usa o db global
    const [novaPessoa] = await query("pessoa").insert(pessoa).returning("*");
    return novaPessoa;
}

    async listarPessoas() {
        const rows = await db("pessoa")
            .join("cidade", "pessoa.cidade_id", "=", "cidade.ibge")
            .select(
                "pessoa.*",
                "cidade.id as cid_id",
                "cidade.nome as cid_nome",
                "cidade.uf as cid_uf",
                "cidade.ibge as cid_ibge"
            );
        return rows;
    }

    async buscarPessoaPorId(id: string) {
        const row = await db("pessoa")
            .join("cidade", "pessoa.cidade_id", "=", "cidade.ibge")
            .select(
                "pessoa.*",
                "cidade.id as cid_id",
                "cidade.nome as cid_nome",
                "cidade.uf as cid_uf",
                "cidade.ibge as cid_ibge"
            )
            .where("pessoa.id", id);
        return row[0];
    }
    async atualizarPessoa(id: string, dados: any) {
        await db("pessoa")
            .where("id", id)
            .update({
                nome: dados.nome,
                cpf: dados.cpf,
                data_nascimento: dados.dataNascimento,
                logradouro: dados.logradouro,
                numero: dados.numero,
                bairro: dados.bairro,
                cidade_id: dados.cidadeIbge,
                estado: dados.estado,
                cep: dados.cep
            });
    }
}