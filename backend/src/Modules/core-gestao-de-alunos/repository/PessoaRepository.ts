import { db } from "../../../database/connection";
import { Pessoa } from "../models/Pessoa";

export class PessoaRepository {
  async criarPessoa(data: Pessoa) {
    const pessoa = await db("pessoas").insert(data).returning("*");

    return pessoa[0];
  }

  async listarPessoas() {
    const pessoas = await db("pessoas").select("*");
    return pessoas;
  }

  async buscarPessoaPorCpf(cpf: string) {
    const pessoa = await db("pessoas").select("*").where("cpf", cpf);
    return pessoa[0];
  }
}
