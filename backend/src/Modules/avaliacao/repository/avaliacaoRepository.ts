import db from "../../../database/index.js";
import type {
  AtualizarAvaliacaoDTO,
  Avaliacao,
  CriarAvaliacaoDTO,
} from "../models/avaliacaoModels.js";

export const avaliacaoRepository = {
  baseQuery() {
    return db<Avaliacao>("piv.avaliacao")
      .leftJoin(
        "piv.turma_disciplina",
        "piv.avaliacao.turma_disciplina_id",
        "piv.turma_disciplina.id",
      )
      .leftJoin("piv.turma", "piv.turma_disciplina.turma_id", "piv.turma.id")
      .leftJoin(
        "piv.curso_disciplina",
        "piv.turma_disciplina.curso_disciplina_id",
        "piv.curso_disciplina.id",
      )
      .leftJoin(
        "piv.disciplinas",
        "piv.curso_disciplina.disciplina_id",
        "piv.disciplinas.id",
      )
      .leftJoin("piv.professor", "piv.turma_disciplina.professor_id", "piv.professor.id")
      .leftJoin("piv.pessoa", "piv.professor.pessoa_id", "piv.pessoa.id")
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
  },

  buscarTodas: async (): Promise<Avaliacao[]> => {
    return await avaliacaoRepository.baseQuery().orderBy("piv.avaliacao.data_lancamento", "desc");
  },

  buscarPorId: async (id: string): Promise<Avaliacao | undefined> => {
    return await avaliacaoRepository.baseQuery().where("piv.avaliacao.id", id).first();
  },

  buscarPorTurmaDisciplina: async (turma_disciplina_id: string): Promise<Avaliacao[]> => {
    return await avaliacaoRepository
      .baseQuery()
      .where("piv.avaliacao.turma_disciplina_id", turma_disciplina_id);
  },

  criar: async (dados: CriarAvaliacaoDTO): Promise<Avaliacao> => {
    const [novaAvaliacao] = await db<Avaliacao>("piv.avaliacao")
      .insert(dados)
      .returning("*");

    if (!novaAvaliacao) {
      throw new Error("Erro ao criar avaliacao");
    }

    const avaliacao = await avaliacaoRepository.buscarPorId(novaAvaliacao.id);
    return avaliacao ?? novaAvaliacao;
  },

  atualizar: async (
    id: string,
    dados: AtualizarAvaliacaoDTO,
  ): Promise<Avaliacao | undefined> => {
    const [avaliacaoAtualizada] = await db<Avaliacao>("piv.avaliacao")
      .where({ id })
      .update(dados)
      .returning("*");

    if (!avaliacaoAtualizada) return undefined;
    return await avaliacaoRepository.buscarPorId(id);
  },

  deletar: async (id: string): Promise<number> => {
    return await db("piv.avaliacao").where({ id }).del();
  },
};
