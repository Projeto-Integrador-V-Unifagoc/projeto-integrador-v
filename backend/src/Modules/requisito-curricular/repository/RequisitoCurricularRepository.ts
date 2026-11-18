import { db } from "../../../database/connection";

export class RequisitoCurricularRepository {
  listarPorMatriz(matrizId: string) {
    return db("curso_disciplina_requisito as r")
      .join("curso_disciplina as destino", "r.curso_disciplina_id", "destino.id")
      .join("disciplinas as d_destino", "destino.disciplina_id", "d_destino.id")
      .join("curso_disciplina as requisito", "r.requisito_curso_disciplina_id", "requisito.id")
      .join("disciplinas as d_requisito", "requisito.disciplina_id", "d_requisito.id")
      .where("destino.matriz_curricular_id", matrizId)
      .select(
        "r.id", "r.tipo", "r.curso_disciplina_id", "r.requisito_curso_disciplina_id",
        "d_destino.id as disciplina_id", "d_destino.codigo as disciplina_codigo", "d_destino.nome as disciplina_nome",
        "d_requisito.id as requisito_disciplina_id", "d_requisito.codigo as requisito_codigo", "d_requisito.nome as requisito_nome",
        "requisito.periodo_ideal as requisito_periodo_ideal",
      )
      .orderBy("d_destino.nome")
      .orderBy("d_requisito.nome");
  }

  buscarItem(id: string) {
    return db("curso_disciplina as cd")
      .join("matriz_curricular as mc", "cd.matriz_curricular_id", "mc.id")
      .where("cd.id", id)
      .select("cd.id", "cd.matriz_curricular_id", "cd.disciplina_id", "cd.periodo_ideal", "mc.status as matriz_status")
      .first();
  }

  buscarRelacao(cursoDisciplinaId: string, requisitoId: string) {
    return db("curso_disciplina_requisito")
      .where({ curso_disciplina_id: cursoDisciplinaId, requisito_curso_disciplina_id: requisitoId })
      .first();
  }

  listarArestas(matrizId: string) {
    return db("curso_disciplina_requisito as r")
      .join("curso_disciplina as cd", "r.curso_disciplina_id", "cd.id")
      .where("cd.matriz_curricular_id", matrizId)
      .select("r.curso_disciplina_id", "r.requisito_curso_disciplina_id");
  }

  criar(data: { id: string; curso_disciplina_id: string; requisito_curso_disciplina_id: string; tipo: string }) {
    return db("curso_disciplina_requisito").insert(data).returning("*").then((rows) => rows[0]);
  }

  atualizar(id: string, tipo: string) {
    return db("curso_disciplina_requisito").where({ id }).update({ tipo, updated_at: db.fn.now() }).returning("*").then((rows) => rows[0] ?? null);
  }

  buscarPorId(id: string) {
    return db("curso_disciplina_requisito as r")
      .join("curso_disciplina as cd", "r.curso_disciplina_id", "cd.id")
      .join("matriz_curricular as mc", "cd.matriz_curricular_id", "mc.id")
      .where("r.id", id)
      .select("r.*", "mc.status as matriz_status")
      .first();
  }

  remover(id: string) {
    return db("curso_disciplina_requisito").where({ id }).del();
  }
}

