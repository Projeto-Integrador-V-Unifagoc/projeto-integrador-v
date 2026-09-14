import type { Knex } from "knex";
import { db } from "../../../database/connection"
import { PessoaCommand } from "../models/Pessoa";

interface AtualizarPessoaInput {
    nome?: string;
    cpf?: string;
    dataNascimento?: string;
    logradouro?: string;
    numero?: number;
    bairro?: string;
    cidadeIbge?: string;
    estado?: string;
    cep?: string;
}

export class PessoaRepository {
    async criarPessoa(pessoa: PessoaCommand, transaction?: Knex.Transaction) {
    const query = transaction || db; // Usa a transação se existir, senão usa o db global
    const [novaPessoa] = await query("pessoa").insert(pessoa).returning("*");
    return novaPessoa;
}

    async buscarPessoaPorCpf(cpf: string, transaction?: Knex.Transaction) {
        const query = transaction || db;
        const pessoa = await query("pessoa").where({ cpf }).first();
        return pessoa ?? null;
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
    async atualizarPessoa(id: string, dados: AtualizarPessoaInput) {
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