import db from "../../../database";
import type { CompetenciaCommand } from "../models/Competencia";

export class CompetenciaRepository {
  listar(filtros: { q?: string; tipo?: string; ativo?: boolean }) {
    const query = db("competencia").select("*");
    if (filtros.q) {
      query.where((builder) => builder
        .whereILike("codigo", `%${filtros.q}%`)
        .orWhereILike("nome", `%${filtros.q}%`)
        .orWhereILike("descricao", `%${filtros.q}%`));
    }
    if (filtros.tipo) query.where({ tipo: filtros.tipo });
    if (filtros.ativo !== undefined) query.where({ ativo: filtros.ativo });
    return query.orderBy("nome");
  }

  buscarPorId(id: string) {
    return db("competencia").where({ id }).first();
  }

  buscarPorCodigo(codigo: string) {
    return db("competencia").where({ codigo }).first();
  }

  async criar(data: CompetenciaCommand) {
    const [row] = await db("competencia").insert(data).returning("*");
    return row;
  }

  async atualizar(id: string, data: Partial<CompetenciaCommand>) {
    const [row] = await db("competencia").where({ id }).update(data).returning("*");
    return row ?? null;
  }

  possuiVinculos(id: string) {
    return db("disciplina_competencia").where({ competencia_id: id }).first().then(Boolean);
  }

  remover(id: string) {
    return db("competencia").where({ id }).del();
  }
}
