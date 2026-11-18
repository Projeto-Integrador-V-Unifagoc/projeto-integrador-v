import type { Knex } from "knex";
import db from "../../../database/index.js";
import type {
  AtribuicaoAvaliacao,
  AtualizarAvaliacaoDTO,
  Avaliacao,
  AvaliacaoCompetencia,
  CompetenciaDisponivelAvaliacao,
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
      executor.raw(`
        COALESCE((
          SELECT json_agg(json_build_object(
            'competencia_id', ac.competencia_id,
            'codigo', c.codigo,
            'nome', c.nome,
            'descricao', c.descricao,
            'tipo', c.tipo,
            'nivel_esperado', dc.nivel_esperado,
            'peso_percentual', ac.peso_percentual::float
          ) ORDER BY COALESCE(dc.ordem, 0), c.nome)
          FROM piv.avaliacao_competencia ac
          JOIN piv.competencia c ON c.id = ac.competencia_id
          LEFT JOIN piv.disciplina_competencia dc
            ON dc.competencia_id = ac.competencia_id
           AND dc.disciplina_id = piv.disciplinas.id
          WHERE ac.avaliacao_id = piv.avaliacao.id
        ), '[]'::json) AS competencias
      `),
      executor.raw("EXISTS (SELECT 1 FROM piv.nota n WHERE n.avaliacao_id = piv.avaliacao.id) AS possui_notas"),
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
      .leftJoin(
        "piv.professor",
        "piv.turma_disciplina.professor_id",
        "piv.professor.id",
      )
      .leftJoin("piv.pessoa", "piv.professor.pessoa_id", "piv.pessoa.id")
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
  ): Promise<Avaliacao[]> => {
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

  buscarPorId: async (
    id: string,
    executor: Executor = db,
  ): Promise<Avaliacao | undefined> =>
    baseQuery(executor).where("piv.avaliacao.id", id).first(),

  buscarPorTurmaDisciplina: async (
    turmaDisciplinaId: string,
    executor: Executor = db,
  ): Promise<Avaliacao[]> =>
    baseQuery(executor).where(
      "piv.avaliacao.turma_disciplina_id",
      turmaDisciplinaId,
    ),

  bloquearAtribuicoes: async (ids: string[], executor: Executor = db) =>
    executor("piv.turma_disciplina")
      .whereIn("id", [...new Set(ids)].sort())
      .orderBy("id")
      .forUpdate(),

  buscarAtribuicaoPorId: (id: string, executor: Executor = db) =>
    executor("piv.turma_disciplina").where({ id }).first(),

  buscarCompetenciasDisponiveis: async (
    turmaDisciplinaId: string,
    executor: Executor = db,
  ): Promise<CompetenciaDisponivelAvaliacao[]> =>
    executor("piv.turma_disciplina as td")
      .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("piv.disciplina_competencia as dc", "cd.disciplina_id", "dc.disciplina_id")
      .join("piv.competencia as c", "dc.competencia_id", "c.id")
      .where("td.id", turmaDisciplinaId)
      .andWhere("c.ativo", true)
      .select(
        "c.id as competencia_id",
        "c.codigo",
        "c.nome",
        "c.descricao",
        "c.tipo",
        "dc.nivel_esperado",
        "dc.obrigatoria",
        "dc.ordem",
      )
      .orderBy([{ column: "dc.ordem", order: "asc" }, { column: "c.nome", order: "asc" }]),

  listarCompetenciasDaAvaliacao: async (
    avaliacaoId: string,
    executor: Executor = db,
  ): Promise<AvaliacaoCompetencia[]> =>
    executor("piv.avaliacao_competencia")
      .where({ avaliacao_id: avaliacaoId })
      .select("competencia_id", "peso_percentual")
      .orderBy("competencia_id"),

  substituirCompetencias: async (
    avaliacaoId: string,
    competencias: AvaliacaoCompetencia[],
    executor: Executor = db,
  ) => {
    await executor("piv.avaliacao_competencia").where({ avaliacao_id: avaliacaoId }).del();
    if (!competencias.length) return;
    await executor("piv.avaliacao_competencia").insert(competencias.map((item) => ({
      avaliacao_id: avaliacaoId,
      competencia_id: item.competencia_id,
      peso_percentual: item.peso_percentual,
    })));
  },

  possuiNotas: async (avaliacaoId: string, executor: Executor = db) => {
    const row = await executor("piv.nota").where({ avaliacao_id: avaliacaoId }).first("id");
    return Boolean(row);
  },

  bloquearAvaliacao: (id: string, executor: Executor = db) =>
    executor("piv.avaliacao").where({ id }).forUpdate().first(),

  criar: async (dados: CriarAvaliacaoDTO, executor: Executor = db) => {
    const { competencias: _competencias, ...dadosAvaliacao } = dados;
    const [row] = await executor<Avaliacao>("piv.avaliacao")
      .insert(dadosAvaliacao)
      .returning("*");
    return (await avaliacaoRepository.buscarPorId(row.id, executor)) ?? row;
  },

  atualizar: async (
    id: string,
    dados: AtualizarAvaliacaoDTO,
    executor: Executor = db,
  ) => {
    const { competencias: _competencias, ...dadosAvaliacao } = dados;
    const [row] = await executor<Avaliacao>("piv.avaliacao")
      .where({ id })
      .update(dadosAvaliacao)
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

  deletar: (id: string, executor: Executor = db) =>
    executor("piv.avaliacao").where({ id }).del(),
};
