import db from "../../../database/index.js";
import type { Avaliacao, AvaliacaoPayload } from "../models/interface.js";

export const AvaliacaoRepository = {
  async buscarTodas(): Promise<Avaliacao[]> {
    return db<Avaliacao>("avaliacoes").select("*");
  },

  async buscarPorId(id: number): Promise<Avaliacao | undefined> {
    return db<Avaliacao>("avaliacoes").where({ id_avaliacao: id }).first();
  },

  async criar(dados: AvaliacaoPayload): Promise<Avaliacao | undefined> {
    const [novaAvaliacao] = await db<Avaliacao>("avaliacoes")
      .insert(dados)
      .returning("*");

    return novaAvaliacao;
  },

  async atualizar(
    id: number,
    dados: Partial<AvaliacaoPayload>,
  ): Promise<Avaliacao | undefined> {
    const [avaliacaoAtualizada] = await db<Avaliacao>("avaliacoes")
      .where({ id_avaliacao: id })
      .update(dados)
      .returning("*");

    return avaliacaoAtualizada;
  },

  async deletar(id: number) {
    return db("avaliacoes").where({ id_avaliacao: id }).del();
  },
};
