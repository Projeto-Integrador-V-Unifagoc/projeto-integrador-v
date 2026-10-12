import type { Knex } from "knex";
import type { AvaliacaoDoPlano } from "../models/PlanoAvaliacao";
import { formatarPontos, parsePontos } from "../models/Pontos";
import type { ContextoAvaliacao } from "../models/avaliacaoModels";
import { RegraPontuacaoRepository } from "./RegraPontuacaoRepository";
import { ErroPontuacao } from "../models/RegraPontuacao";
import { transacaoAcademica, type AlvosAcademicos } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import { traduzirErroBancoAvaliacao } from "../errors/avaliacaoErrors";
import db from "../../../database/index.js";
import type {
  AtribuicaoAvaliacao,
  AtualizarAvaliacaoDTO,
  Avaliacao,
  CriarAvaliacaoDTO,
} from "../models/avaliacaoModels.js";

type Executor = Knex | Knex.Transaction;
export interface PedidoTransacaoAvaliacao {
  avaliacaoId?: string;
  ofertaIds?: string[];
  estrutural?: boolean;
}

const regrasRepository = new RegraPontuacaoRepository(db);
const regrasProtegidas = new WeakMap<object, readonly string[]>();
const iso = (valor: Date | string) => valor instanceof Date ? valor.toISOString() : valor;

function documento(linha: Record<string, any>): Avaliacao {
  const { primeira_nota_em, ...dados } = linha;
  return {
    ...dados, valor: formatarPontos(parsePontos(linha.valor)), subgrupo_id: linha.subgrupo_id ?? null,
    regraPontuacaoId: linha.regraPontuacaoId ?? null,
    primeiraNotaEm: primeira_nota_em ? iso(primeira_nota_em) : null,
    data_lancamento: iso(linha.data_lancamento),
    data_devolucao: linha.data_devolucao ? iso(linha.data_devolucao).slice(0, 10) : null,
  } as Avaliacao;
}

function consultaOferta(id: string, executor: Executor) {
  return executor("piv.turma_disciplina as td")
    .join("piv.turma as t", "t.id", "td.turma_id")
    .join("piv.periodo_letivo as pl", "pl.id", "t.periodo_letivo_id")
    .join("piv.curso_disciplina as cd", "cd.id", "td.curso_disciplina_id")
    .leftJoin("piv.professor as p", "p.id", "td.professor_id")
    .select("td.*", "t.curso_id", "t.periodo_letivo_id", "t.status as turma_status",
      "pl.status as periodo_status", "pl.ativo as periodo_ativo", "cd.disciplina_id",
      "cd.curso_id as matriz_curso_id", "p.usuario_id as professor_usuario_id", "p.ativo as professor_ativo")
    .where("td.id", id).first();
}

async function descobrirAlvos(pedido: PedidoTransacaoAvaliacao, trx: Knex.Transaction): Promise<AlvosAcademicos> {
  const avaliacao = pedido.avaliacaoId ? await trx("piv.avaliacao").where({ id: pedido.avaliacaoId }).first("turma_disciplina_id") : null;
  const ids = [...new Set([...(pedido.ofertaIds ?? []), ...(avaliacao ? [avaliacao.turma_disciplina_id] : [])])].sort();
  const alvos: AlvosAcademicos = { cursos: [], disciplinas: [], periodos: [], turmas: [],
    cursosDisciplinas: [], professores: [], regras: [], ofertas: ids, avaliacoes: pedido.avaliacaoId ? [pedido.avaliacaoId] : [] };
  for (const id of ids) {
    const oferta = await consultaOferta(id, trx);
    if (!oferta) continue;
    alvos.cursos = [...alvos.cursos!, oferta.curso_id, oferta.matriz_curso_id];
    alvos.disciplinas = [...alvos.disciplinas!, oferta.disciplina_id];
    alvos.periodos = [...alvos.periodos!, oferta.periodo_letivo_id];
    alvos.turmas = [...alvos.turmas!, oferta.turma_id];
    alvos.cursosDisciplinas = [...alvos.cursosDisciplinas!, oferta.curso_disciplina_id];
    if (oferta.professor_id) alvos.professores = [...alvos.professores!, oferta.professor_id];
    // Metadados e exclusão de avaliação já vinculada não alteram a regra.
    if (pedido.estrutural !== false) {
      const regra = await trx("piv.regra_pontuacao").where({ curso_id: oferta.curso_id, periodo_letivo_id: oferta.periodo_letivo_id }).first("id");
      alvos.regras = [...alvos.regras!, ...(regra ? [regra.id] : []), ...(oferta.regra_pontuacao_id ? [oferta.regra_pontuacao_id] : [])];
    }
  }
  return alvos;
}

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
    .leftJoin(
      "piv.professor",
      "piv.turma_disciplina.professor_id",
      "piv.professor.id",
    )
    .leftJoin("piv.pessoa", "piv.professor.pessoa_id", "piv.pessoa.id")
    .select(
      "piv.avaliacao.*",
      "piv.turma_disciplina.regra_pontuacao_id as regraPontuacaoId",
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
  transacaoAcademica: async <T>(pedido: PedidoTransacaoAvaliacao, callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> => {
    try {
      return await transacaoAcademica(db, { descobrir: (trx) => descobrirAlvos(pedido, trx) }, async (trx, alvos) => {
        if (pedido.estrutural !== false) regrasProtegidas.set(trx, alvos.regras);
        try { return await callback(trx); }
        finally { regrasProtegidas.delete(trx); }
      });
    } catch (erro) { return traduzirErroBancoAvaliacao(erro); }
  },
  buscarRegraDaOferta: async (ofertaId: string, executor: Executor) => {
    const oferta = await consultaOferta(ofertaId, executor);
    if (!oferta) return null;
    const regra = await regrasRepository.lerPorPar(oferta.curso_id, oferta.periodo_letivo_id, executor);
    const protegidas = regrasProtegidas.get(executor);
    // Uma configuração pode aparecer após a descoberta sem disputar um lock de
    // linha ausente. Reiniciar integralmente antes de usar a regra recém-criada.
    if (regra && protegidas && !protegidas.includes(regra.id)) throw Object.assign(new Error("Alvos acadêmicos alterados."), { code: "40001" });
    if (regra && oferta.regra_pontuacao_id && oferta.regra_pontuacao_id !== regra.id) {
      throw new ErroPontuacao(409, "VINCULO_PRESERVADO", "A oferta mantém sua regra de pontuação original.");
    }
    return regra;
  },
  vincularPrimeiroUso: (ofertaId: string, contexto: ContextoAvaliacao, trx: Knex.Transaction) =>
    regrasRepository.vincularPrimeiroUso(trx, ofertaId, contexto),
  listarParaPlano: (ofertaId: string, executor: Executor): Promise<AvaliacaoDoPlano[]> =>
    executor("piv.avaliacao").where({ turma_disciplina_id: ofertaId })
      .select("id", "subgrupo_id", "tipo_avaliacao", "valor").orderBy("id"),
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
    return (await query).map(documento);
  },

  buscarPorId: async (
    id: string,
    executor: Executor = db,
  ): Promise<Avaliacao | undefined> => {
    const linha = await baseQuery(executor).where("piv.avaliacao.id", id).first();
    return linha ? documento(linha) : undefined;
  },

  buscarPorTurmaDisciplina: async (
    turmaDisciplinaId: string,
    executor: Executor = db,
  ): Promise<Avaliacao[]> =>
    (await baseQuery(executor).where(
      "piv.avaliacao.turma_disciplina_id",
      turmaDisciplinaId,
    )).map(documento),

  /** Lista de ofertas já autorizadas pelo serviço comum; executor obrigatório. */
  listarEmLote: async (ofertaIds: string[], executor: Executor): Promise<Avaliacao[]> => {
    if (ofertaIds.length === 0) return [];
    return (await baseQuery(executor).whereIn("piv.avaliacao.turma_disciplina_id", ofertaIds)
      .orderBy(["piv.avaliacao.data_lancamento", "piv.avaliacao.id"])).map(documento);
  },

  buscarAtribuicaoPorId: (id: string, executor: Executor = db) => consultaOferta(id, executor),

  criar: async (dados: CriarAvaliacaoDTO, executor: Executor = db) => {
    const [row] = await executor<Avaliacao>("piv.avaliacao")
      .insert(dados)
      .returning("*");
    return (await avaliacaoRepository.buscarPorId(row.id, executor)) ?? documento(row);
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
    return (await baseQuery(executor).whereIn(
      "piv.avaliacao.matricula_turma_disciplina_id",
      ids,
    )).map(documento);
  },

  deletar: (id: string, executor: Executor = db) =>
    executor("piv.avaliacao").where({ id }).del(),
};
