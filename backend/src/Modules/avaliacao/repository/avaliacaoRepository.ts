import type { Knex } from "knex";
import db from "../../../database/index.js";
import type {
  AtribuicaoAvaliacao,
  AtualizarAvaliacaoDTO,
  Avaliacao,
  CriarAvaliacaoDTO,
} from "../models/avaliacaoModels.js";

type Executor = Knex | Knex.Transaction;

function baseQuery(executor: Executor = db) {
  return executor<Avaliacao>("piv.avaliacao")
    .join(
      "piv.turma_disciplina",
      "piv.avaliacao.turma_disciplina_id",
      "piv.turma_disciplina.id",
    )
    .join("piv.turma", "piv.turma_disciplina.turma_id", "piv.turma.id")
    .join(
      "piv.curso_disciplina",
      "piv.turma_disciplina.curso_disciplina_id",
      "piv.curso_disciplina.id",
    )
    .join(
      "piv.disciplinas",
      "piv.curso_disciplina.disciplina_id",
      "piv.disciplinas.id",
    )
    .join(
      "piv.professor",
      "piv.turma_disciplina.professor_id",
      "piv.professor.id",
    )
    .join("piv.pessoa", "piv.professor.pessoa_id", "piv.pessoa.id")
    .select(
      "piv.avaliacao.*",
      "piv.turma.id as turma_id",
      "piv.turma.sigla as turma_sigla",
      "piv.turma.descricao as turma_descricao",
      "piv.disciplinas.id as disciplina_id",
      "piv.disciplinas.codigo as disciplina_codigo",
      "piv.disciplinas.nome as disciplina_nome",
      "piv.professor.id as professor_id",
      "piv.pessoa.nome as professor_nome",
    );
}

export const avaliacaoRepository = {
  transacao: <T>(callback: (trx: Knex.Transaction) => Promise<T>) =>
    db.transaction(callback),

  buscarProfessorPorUsuarioId: (usuarioId: string, executor: Executor = db) =>
    executor("piv.professor")
      .where({ usuario_id: usuarioId, ativo: true })
      .first(),

  listarAtribuicoes: async (
    professorId?: string,
    executor: Executor = db,
  ): Promise<AtribuicaoAvaliacao[]> => {
    const query = executor("piv.turma_disciplina")
      .join("piv.turma", "piv.turma_disciplina.turma_id", "piv.turma.id")
      .join(
        "piv.curso_disciplina",
        "piv.turma_disciplina.curso_disciplina_id",
        "piv.curso_disciplina.id",
      )
      .join(
        "piv.disciplinas",
        "piv.curso_disciplina.disciplina_id",
        "piv.disciplinas.id",
      )
      .join(
        "piv.professor",
        "piv.turma_disciplina.professor_id",
        "piv.professor.id",
      )
      .join("piv.pessoa", "piv.professor.pessoa_id", "piv.pessoa.id")
      .whereIn("piv.turma_disciplina.status", ["ativa", "ATIVA"])
      .whereIn("piv.turma.status", ["ativa", "ATIVA"])
      .select(
        "piv.turma_disciplina.id",
        "piv.turma_disciplina.professor_id",
        "piv.turma.id as turma_id",
        "piv.turma.sigla as turma_sigla",
        "piv.turma.descricao as turma_descricao",
        "piv.disciplinas.id as disciplina_id",
        "piv.disciplinas.codigo as disciplina_codigo",
        "piv.disciplinas.nome as disciplina_nome",
        "piv.pessoa.nome as professor_nome",
      )
      .orderBy(["piv.turma.sigla", "piv.disciplinas.nome"]);
    if (professorId)
      query.where("piv.turma_disciplina.professor_id", professorId);
    return query;
  },

  buscarTodas: async (
    professorId?: string,
    turmaDisciplinaId?: string,
    executor: Executor = db,
  ) => {
    const query = baseQuery(executor).orderBy(
      "piv.avaliacao.data_lancamento",
      "desc",
    );
    if (professorId)
      query.where("piv.turma_disciplina.professor_id", professorId);
    if (turmaDisciplinaId)
      query.where("piv.avaliacao.turma_disciplina_id", turmaDisciplinaId);
    return query;
  },

  buscarPorId: (id: string, executor: Executor = db) =>
    baseQuery(executor).where("piv.avaliacao.id", id).first(),

  buscarPorTurmaDisciplina: (
    turmaDisciplinaId: string,
    executor: Executor = db,
  ) =>
    baseQuery(executor).where(
      "piv.avaliacao.turma_disciplina_id",
      turmaDisciplinaId,
    ),

  bloquearAtribuicoes: async (ids: string[], executor: Executor) =>
    executor("piv.turma_disciplina")
      .whereIn("id", [...new Set(ids)].sort())
      .orderBy("id")
      .forUpdate(),

  buscarAtribuicaoPorId: (id: string, executor: Executor = db) =>
    executor("piv.turma_disciplina").where({ id }).first(),

  bloquearAvaliacao: (id: string, executor: Executor) =>
    executor("piv.avaliacao").where({ id }).forUpdate().first(),

  criar: async (dados: CriarAvaliacaoDTO, executor: Executor = db) => {
    const [row] = await executor<Avaliacao>("piv.avaliacao")
      .insert(dados)
      .returning("*");
    return (await avaliacaoRepository.buscarPorId(row.id, executor)) ?? row;
  },

  atualizar: async (
    id: string,
    dados: AtualizarAvaliacaoDTO,
    executor: Executor = db,
  ) => {
    const [row] = await executor<Avaliacao>("piv.avaliacao")
      .where({ id })
      .update(dados)
      .returning("*");
    return row ? avaliacaoRepository.buscarPorId(id, executor) : undefined;
  },

  buscarPorMatriculaTurmaDisciplinaIds: async (
    ids: string[],
    executor: Executor = db,
  ): Promise<Avaliacao[]> => {
    if (!ids || ids.length === 0) return [];
    return baseQuery(executor).whereIn(
      "piv.avaliacao.matricula_turma_disciplina_id",
      ids,
    );
  },

  criar: async (dados: CriarAvaliacaoDTO, executor: Executor = db) => {
    const [row] = await executor<Avaliacao>("piv.avaliacao")
      .insert(dados)
      .returning("*");
    return (await avaliacaoRepository.buscarPorId(row.id, executor)) ?? row;
  },

  atualizar: async (
    id: string,
    dados: AtualizarAvaliacaoDTO,
    executor: Executor = db,
  ) => {
    const [row] = await executor<Avaliacao>("piv.avaliacao")
      .where({ id })
      .update(dados)
      .returning("*");
    return row ? avaliacaoRepository.buscarPorId(id, executor) : undefined;
  },

  deletar: (id: string, executor: Executor = db) =>
    executor("piv.avaliacao").where({ id }).del(),
};
