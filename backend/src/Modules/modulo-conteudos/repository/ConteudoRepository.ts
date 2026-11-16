import type { Knex } from "knex";
import { db } from "../../../database/connection";

type Executor = Knex | Knex.Transaction;

const T = {
  posse: "piv.conteudo_disciplina",
  topico: "piv.conteudo_topico",
  pagina: "piv.conteudo_pagina",
  arquivo: "piv.conteudo_arquivo",
};

// Campos da página sem o documento (a árvore não carrega os blocos).
const camposResumoPagina = [
  "p.id",
  "p.topico_id",
  "p.titulo",
  "p.ordem",
  "p.oculta",
  "p.versao",
  "p.palavras",
  "p.imagens",
  "p.videos",
  "p.arquivos",
  "p.links",
  "p.minutos_estimados",
  "p.updated_at",
  "u.nome as atualizado_por_nome",
];

export class ConteudoRepository {
  transacao<T>(fn: (trx: Knex.Transaction) => Promise<T>) {
    return db.transaction(fn);
  }

  // ---------- contexto e permissão ----------

  async buscarProfessorPorUsuarioId(usuarioId: string) {
    return db("piv.professor").where({ usuario_id: usuarioId }).first("id", "ativo");
  }

  async buscarCursoDisciplina(id: string, executor: Executor = db) {
    return executor("piv.curso_disciplina as cd")
      .join("piv.curso as c", "cd.curso_id", "c.id")
      .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
      .where("cd.id", id)
      .first(
        "cd.id",
        "cd.ativo",
        "cd.carga_horaria",
        "cd.periodo_ideal",
        "c.id as curso_id",
        "c.nome as curso_nome",
        "c.codigo as curso_codigo",
        "d.id as disciplina_id",
        "d.nome as disciplina_nome",
        "d.codigo as disciplina_codigo",
      );
  }

  async professorVinculado(professorId: string, cursoDisciplinaId: string, executor: Executor = db) {
    const vinculo = await executor("piv.professor_disciplina")
      .where({ professor_id: professorId, curso_disciplina_id: cursoDisciplinaId })
      .first("id");
    return Boolean(vinculo);
  }

  async professorAtivoVinculado(professorId: string, cursoDisciplinaId: string, executor: Executor = db) {
    const professor = await executor("piv.professor as pr")
      .join("piv.professor_disciplina as pd", "pd.professor_id", "pr.id")
      .where({ "pr.id": professorId, "pr.ativo": true, "pd.curso_disciplina_id": cursoDisciplinaId })
      .first("pr.id");
    return Boolean(professor);
  }

  async buscarPosse(cursoDisciplinaId: string, executor: Executor = db, bloquear = false) {
    const query = executor(`${T.posse} as cd`)
      .leftJoin("piv.professor as pr", "cd.responsavel_professor_id", "pr.id")
      .leftJoin("piv.pessoa as pe", "pr.pessoa_id", "pe.id")
      .where("cd.curso_disciplina_id", cursoDisciplinaId)
      .first(
        "cd.id",
        "cd.curso_disciplina_id",
        "cd.responsavel_professor_id",
        "cd.responsavel_desde",
        "pe.nome as responsavel_nome",
      );
    if (bloquear) query.forUpdate("cd");
    return query;
  }

  async criarPosseSeAusente(cursoDisciplinaId: string, responsavelProfessorId: string | null, executor: Executor) {
    await executor(T.posse)
      .insert({
        curso_disciplina_id: cursoDisciplinaId,
        responsavel_professor_id: responsavelProfessorId,
        responsavel_desde: responsavelProfessorId ? executor.fn.now() : null,
      })
      .onConflict("curso_disciplina_id")
      .ignore();
  }

  async definirResponsavel(
    cursoDisciplinaId: string,
    professorId: string | null,
    transferidoPor: string | null,
    executor: Executor,
  ) {
    await executor(T.posse).where({ curso_disciplina_id: cursoDisciplinaId }).update({
      responsavel_professor_id: professorId,
      responsavel_desde: professorId ? executor.fn.now() : null,
      transferido_por_usuario_id: transferidoPor,
      updated_at: executor.fn.now(),
    });
  }

  // ---------- listagens de navegação ----------

  async listarCursos(professorId?: string) {
    const query = db("piv.curso as c")
      .join("piv.curso_disciplina as cd", "cd.curso_id", "c.id")
      .where("cd.ativo", true)
      .groupBy("c.id", "c.nome", "c.codigo")
      .orderBy("c.nome")
      .select("c.id", "c.nome", "c.codigo")
      .countDistinct({ total_disciplinas: "cd.id" });
    if (professorId) {
      query.join("piv.professor_disciplina as pd", "pd.curso_disciplina_id", "cd.id").where("pd.professor_id", professorId);
    }
    return query;
  }

  async buscarCurso(cursoId: string) {
    return db("piv.curso").where({ id: cursoId }).first("id", "nome", "codigo");
  }

  async listarDisciplinasDoCurso(cursoId: string, professorId?: string) {
    const totalTopicos = db(`${T.topico} as t`)
      .whereRaw("t.curso_disciplina_id = cd.id")
      .count("*");
    const totalPublicados = db(`${T.topico} as t`)
      .whereRaw("t.curso_disciplina_id = cd.id")
      .where("t.publicado", true)
      .count("*");
    const totalProfessores = db("piv.professor_disciplina as pdx")
      .join("piv.professor as prx", "pdx.professor_id", "prx.id")
      .whereRaw("pdx.curso_disciplina_id = cd.id")
      .where("prx.ativo", true)
      .count("*");

    const query = db("piv.curso_disciplina as cd")
      .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
      .leftJoin(`${T.posse} as cp`, "cp.curso_disciplina_id", "cd.id")
      .leftJoin("piv.professor as pr", "cp.responsavel_professor_id", "pr.id")
      .leftJoin("piv.pessoa as pe", "pr.pessoa_id", "pe.id")
      .where("cd.curso_id", cursoId)
      .where("cd.ativo", true)
      .orderBy([{ column: "cd.periodo_ideal", order: "asc", nulls: "last" }, { column: "d.nome" }])
      .select(
        "cd.id",
        "cd.carga_horaria",
        "cd.periodo_ideal",
        "d.id as disciplina_id",
        "d.nome as disciplina_nome",
        "d.codigo as disciplina_codigo",
        "cp.responsavel_professor_id",
        "pe.nome as responsavel_nome",
        totalTopicos.as("total_topicos"),
        totalPublicados.as("total_publicados"),
        totalProfessores.as("total_professores"),
      );
    if (professorId) {
      query.join("piv.professor_disciplina as pd", "pd.curso_disciplina_id", "cd.id").where("pd.professor_id", professorId);
    }
    return query;
  }

  async listarProfessoresVinculados(cursoDisciplinaId: string) {
    return db("piv.professor_disciplina as pd")
      .join("piv.professor as pr", "pd.professor_id", "pr.id")
      .join("piv.pessoa as pe", "pr.pessoa_id", "pe.id")
      .where("pd.curso_disciplina_id", cursoDisciplinaId)
      .orderBy("pe.nome")
      .select("pr.id", "pe.nome", "pr.ativo");
  }

  // ---------- tópicos ----------

  async listarTopicos(cursoDisciplinaId: string, executor: Executor = db) {
    return executor(`${T.topico} as t`)
      .leftJoin("piv.usuario as u", "t.atualizado_por_usuario_id", "u.id")
      .where("t.curso_disciplina_id", cursoDisciplinaId)
      .orderBy([{ column: "t.ordem" }, { column: "t.created_at" }])
      .select(
        "t.id",
        "t.titulo",
        "t.descricao",
        "t.ordem",
        "t.publicado",
        "t.publicado_em",
        "t.updated_at",
        "u.nome as atualizado_por_nome",
      );
  }

  async listarPaginasDaDisciplina(cursoDisciplinaId: string, executor: Executor = db) {
    return executor(`${T.pagina} as p`)
      .join(`${T.topico} as t`, "p.topico_id", "t.id")
      .leftJoin("piv.usuario as u", "p.atualizado_por_usuario_id", "u.id")
      .where("t.curso_disciplina_id", cursoDisciplinaId)
      .orderBy([{ column: "p.ordem" }, { column: "p.created_at" }])
      .select(camposResumoPagina);
  }

  async contarTopicos(cursoDisciplinaId: string, executor: Executor = db) {
    const linha = await executor(T.topico).where({ curso_disciplina_id: cursoDisciplinaId }).count({ total: "*" }).first();
    return Number(linha?.total ?? 0);
  }

  async proximaOrdemDeTopico(cursoDisciplinaId: string, executor: Executor = db) {
    const linha = await executor(T.topico).where({ curso_disciplina_id: cursoDisciplinaId }).max({ maior: "ordem" }).first();
    return Number(linha?.maior ?? 0) + 1;
  }

  async buscarTopico(id: string, executor: Executor = db) {
    return executor(T.topico).where({ id }).first();
  }

  async criarTopico(dados: Record<string, unknown>, executor: Executor = db) {
    const [topico] = await executor(T.topico).insert(dados).returning("*");
    return topico;
  }

  async atualizarTopico(id: string, dados: Record<string, unknown>, executor: Executor = db) {
    const [topico] = await executor(T.topico)
      .where({ id })
      .update({ ...dados, updated_at: executor.fn.now() })
      .returning("*");
    return topico ?? null;
  }

  async tocarTopico(id: string, usuarioId: string, executor: Executor = db) {
    await executor(T.topico).where({ id }).update({ atualizado_por_usuario_id: usuarioId, updated_at: executor.fn.now() });
  }

  async excluirTopico(id: string, executor: Executor = db) {
    return executor(T.topico).where({ id }).del();
  }

  // ---------- páginas ----------

  async listarPaginasDoTopico(topicoId: string, executor: Executor = db) {
    return executor(T.pagina).where({ topico_id: topicoId }).orderBy([{ column: "ordem" }, { column: "created_at" }]);
  }

  async contarPaginas(topicoId: string, executor: Executor = db) {
    const linha = await executor(T.pagina).where({ topico_id: topicoId }).count({ total: "*" }).first();
    return Number(linha?.total ?? 0);
  }

  async contarPaginasVisiveis(topicoId: string, executor: Executor = db) {
    const linha = await executor(T.pagina).where({ topico_id: topicoId, oculta: false }).count({ total: "*" }).first();
    return Number(linha?.total ?? 0);
  }

  async proximaOrdemDePagina(topicoId: string, executor: Executor = db) {
    const linha = await executor(T.pagina).where({ topico_id: topicoId }).max({ maior: "ordem" }).first();
    return Number(linha?.maior ?? 0) + 1;
  }

  async buscarPagina(id: string, executor: Executor = db) {
    return executor(`${T.pagina} as p`)
      .join(`${T.topico} as t`, "p.topico_id", "t.id")
      .leftJoin("piv.usuario as u", "p.atualizado_por_usuario_id", "u.id")
      .where("p.id", id)
      .first(
        "p.*",
        "t.curso_disciplina_id",
        "t.titulo as topico_titulo",
        "t.publicado as topico_publicado",
        "u.nome as atualizado_por_nome",
      );
  }

  async criarPagina(dados: Record<string, unknown>, executor: Executor = db) {
    const [pagina] = await executor(T.pagina).insert(dados).returning("*");
    return pagina;
  }

  async atualizarPagina(id: string, dados: Record<string, unknown>, executor: Executor = db) {
    const [pagina] = await executor(T.pagina)
      .where({ id })
      .update({ ...dados, updated_at: executor.fn.now() })
      .returning("*");
    return pagina ?? null;
  }

  // Grava o documento só se ninguém salvou depois da versão que o cliente abriu.
  async salvarBlocosSeVersao(id: string, versao: number, dados: Record<string, unknown>, executor: Executor = db) {
    const [pagina] = await executor(T.pagina)
      .where({ id, versao })
      .update({ ...dados, versao: executor.raw("versao + 1"), updated_at: executor.fn.now() })
      .returning("*");
    return pagina ?? null;
  }

  async deslocarPaginas(topicoId: string, aPartirDaOrdem: number, executor: Executor) {
    await executor(T.pagina).where({ topico_id: topicoId }).where("ordem", ">=", aPartirDaOrdem).increment("ordem", 1);
  }

  async excluirPagina(id: string, executor: Executor = db) {
    return executor(T.pagina).where({ id }).del();
  }

  // ---------- aluno ----------

  async buscarAlunoPorUsuarioId(usuarioId: string) {
    return db("piv.aluno").where({ usuario_id: usuarioId }).first("id");
  }

  // Oferta (turma_disciplina) em que o aluno tem vínculo não cancelado e matrícula em curso ou concluída.
  async buscarOfertaDoAluno(alunoId: string, turmaDisciplinaId: string) {
    return db("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("piv.turma as t", "td.turma_id", "t.id")
      .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
      .join("piv.curso as c", "cd.curso_id", "c.id")
      .leftJoin("piv.professor as pr", "td.professor_id", "pr.id")
      .leftJoin("piv.pessoa as pe", "pr.pessoa_id", "pe.id")
      .where("m.aluno_id", alunoId)
      .where("td.id", turmaDisciplinaId)
      .whereNot("mtd.status", "cancelada")
      .whereNotIn("m.status", ["cancelada", "pendente"])
      .first(
        "td.id as turma_disciplina_id",
        "cd.id as curso_disciplina_id",
        "d.id as disciplina_id",
        "d.nome as disciplina_nome",
        "d.codigo as disciplina_codigo",
        "c.nome as curso_nome",
        "t.sigla as turma_sigla",
        "pe.nome as professor_nome",
      );
  }

  async alunoAcessaCursoDisciplina(alunoId: string, cursoDisciplinaId: string) {
    const linha = await db("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .where("m.aluno_id", alunoId)
      .where("td.curso_disciplina_id", cursoDisciplinaId)
      .whereNot("mtd.status", "cancelada")
      .whereNotIn("m.status", ["cancelada", "pendente"])
      .first("mtd.id");
    return Boolean(linha);
  }

  // ---------- arquivos ----------

  async criarArquivo(dados: Record<string, unknown>) {
    const [arquivo] = await db(T.arquivo).insert(dados).returning("*");
    return arquivo;
  }

  async buscarArquivo(id: string) {
    return db(T.arquivo).where({ id }).first();
  }

  async contarArquivosDaDisciplina(ids: string[], cursoDisciplinaId: string) {
    if (!ids.length) return 0;
    const linha = await db(T.arquivo)
      .whereIn("id", ids)
      .where({ curso_disciplina_id: cursoDisciplinaId })
      .count({ total: "*" })
      .first();
    return Number(linha?.total ?? 0);
  }
}
