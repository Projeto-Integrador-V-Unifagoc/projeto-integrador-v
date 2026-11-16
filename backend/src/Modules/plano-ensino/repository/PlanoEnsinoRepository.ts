import { db } from "../../../database/connection";

export class PlanoEnsinoRepository {
  buscarProfessorPorUsuario(usuarioId: string) { return db("professor").where("usuario_id", usuarioId).select("id", "ativo").first(); }
  buscarOferta(id: string) {
    return db("turma_disciplina as td").join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id").join("disciplinas as d", "cd.disciplina_id", "d.id").join("turma as t", "td.turma_id", "t.id").where("td.id", id)
      .select("td.id", "td.professor_id", "td.status", "t.sigla as turma_sigla", "d.id as disciplina_id", "d.codigo as disciplina_codigo", "d.nome as disciplina_nome", "d.ementa").first();
  }
  listar(ofertaId: string) { return db("plano_ensino").where("turma_disciplina_id", ofertaId).orderBy("versao", "desc"); }
  buscar(id: string) { return db("plano_ensino").where({ id }).first(); }
  async proximaVersao(ofertaId: string) { const row = await db("plano_ensino").where("turma_disciplina_id", ofertaId).max({ versao: "versao" }).first(); return Number(row?.versao ?? 0) + 1; }
  criar(data: any) { return db("plano_ensino").insert(data).returning("*").then((rows) => rows[0]); }
  atualizar(id: string, data: any) { return db("plano_ensino").where({ id }).update({ ...data, updated_at: db.fn.now() }).returning("*").then((rows) => rows[0] ?? null); }
  listarCompetencias(disciplinaId: string) {
    return db("disciplina_competencia as dc").join("competencia as c", "dc.competencia_id", "c.id").where("dc.disciplina_id", disciplinaId)
      .select("c.id", "c.codigo", "c.nome", "c.descricao", "c.tipo", "dc.nivel_esperado", "dc.obrigatoria").orderBy("dc.ordem");
  }
  aprovar(id: string, ofertaId: string, dados: any) {
    return db.transaction(async (trx) => {
      await trx("plano_ensino").where({ turma_disciplina_id: ofertaId, status: "APROVADO" }).whereNot({ id }).update({ status: "ARQUIVADO", arquivado_em: trx.fn.now(), updated_at: trx.fn.now() });
      const [plano] = await trx("plano_ensino").where({ id, status: "SUBMETIDO" }).update({ ...dados, status: "APROVADO", aprovado_em: trx.fn.now(), updated_at: trx.fn.now() }).returning("*");
      return plano ?? null;
    });
  }
}

