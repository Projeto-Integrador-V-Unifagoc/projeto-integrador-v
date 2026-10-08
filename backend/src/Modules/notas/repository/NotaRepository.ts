import type { Knex } from "knex";
import db from "../../../database/index.js";
import { snapshotAcademico, transacaoAcademica } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import { formatarPontos, parsePontos } from "../../avaliacao/models/Pontos";
import { erroNota } from "../errors/NotaError";

type Executor = Knex | Knex.Transaction;

const STATUS_ATIVO = ["ativa", "ATIVA", "ATIVO", "MATRICULADO", "REGULAR"];
const STATUS_MATRICULA_EM_CURSO = [...STATUS_ATIVO, "pendente", "PENDENTE"];
const REGULARES = ["REGULAR", "PROVA", "TPI", "TRABALHO"];

export interface SalvarLoteArgs {
  avaliacaoId: string;
  usuarioId: string;
  perfil: string;
  itens: Array<{ matriculaId: string; valor: string }>;
  motivo?: string;
}

export class NotaRepository {
  constructor(readonly banco: Knex = db) {}

  transacao<T>(callback: (trx: Knex.Transaction) => Promise<T>) {
    return this.banco.transaction(callback);
  }

  snapshot<T>(callback: (trx: Knex.Transaction) => Promise<T>) {
    return snapshotAcademico(this.banco, callback);
  }

  /** Descoberta não autoriza: o callback relê contexto, vínculo e estado após T010. */
  transacaoParaNotas<T>(avaliacaoId: string, alunoIds: string[], callback: (trx: Knex.Transaction) => Promise<T>) {
    return this.transacaoDaAvaliacao(avaliacaoId, alunoIds, [], callback);
  }

  transacaoParaAutorizacao<T>(avaliacaoId: string, matriculaId: string | undefined, callback: (trx: Knex.Transaction) => Promise<T>) {
    return this.transacaoDaAvaliacao(avaliacaoId, [], matriculaId ? [matriculaId] : [], callback);
  }

  /** GET condicionado pode criar uma avaliação; usa o mesmo protocolo dos escritores. */
  transacaoParaRecuperacao<T>(ofertaId: string, callback: (trx: Knex.Transaction) => Promise<T>) {
    return transacaoAcademica(this.banco, { descobrir: async (trx) => {
      const oferta = await trx("piv.turma_disciplina as td")
        .join("piv.turma as t", "t.id", "td.turma_id")
        .join("piv.curso_disciplina as cd", "cd.id", "td.curso_disciplina_id")
        .where("td.id", ofertaId).first("td.id", "td.professor_id", "td.regra_pontuacao_id",
          "t.id as turma_id", "t.curso_id", "t.periodo_letivo_id", "cd.id as matriz_id", "cd.disciplina_id");
      if (!oferta) return {};
      const regra = await trx("piv.regra_pontuacao").where({ curso_id: oferta.curso_id,
        periodo_letivo_id: oferta.periodo_letivo_id }).first("id");
      const avaliacoes = await trx("piv.avaliacao").where("turma_disciplina_id", ofertaId).select("id");
      const avIds = avaliacoes.map((a) => String(a.id));
      const matriculas = await trx("piv.matricula_turma_disciplina as mtd")
        .join("piv.matricula as m", "m.id", "mtd.matricula_id").where("mtd.turma_disciplina_id", ofertaId)
        .select("mtd.id", "m.id as matricula_id");
      const notas = await trx("piv.nota").whereIn("avaliacao_id", avIds).select("id");
      const autorizacoes = await trx("piv.nota_autorizacao_excepcional").whereIn("avaliacao_id", avIds).select("id");
      return { cursos: [oferta.curso_id], disciplinas: [oferta.disciplina_id], periodos: [oferta.periodo_letivo_id],
        turmas: [oferta.turma_id], cursosDisciplinas: [oferta.matriz_id],
        professores: oferta.professor_id ? [oferta.professor_id] : [],
        regras: [...new Set([regra?.id, oferta.regra_pontuacao_id].filter((id): id is string => Boolean(id)))],
        ofertas: [ofertaId], avaliacoes: avIds, matriculas: matriculas.map((m) => String(m.matricula_id)),
        matriculasDisciplinas: matriculas.map((m) => String(m.id)), notas: notas.map((n) => String(n.id)),
        autorizacoes: autorizacoes.map((a) => String(a.id)) };
    } }, callback);
  }

  private transacaoDaAvaliacao<T>(avaliacaoId: string, alunoIds: string[], matriculaIdsAlvo: string[], callback: (trx: Knex.Transaction) => Promise<T>) {
    return transacaoAcademica(this.banco, {
      descobrir: async (trx) => {
        const avaliacao = await trx("piv.avaliacao as a")
          .join("piv.turma_disciplina as td", "td.id", "a.turma_disciplina_id")
          .join("piv.turma as t", "t.id", "td.turma_id")
          .join("piv.curso_disciplina as cd", "cd.id", "td.curso_disciplina_id")
          .where("a.id", avaliacaoId).first("a.id", "td.id as oferta_id", "td.professor_id",
            "t.id as turma_id", "t.periodo_letivo_id", "t.curso_id", "cd.id as matriz_id", "cd.disciplina_id");
        if (!avaliacao) return {};
        const matriculas = await trx("piv.matricula_turma_disciplina as mtd")
          .join("piv.matricula as m", "m.id", "mtd.matricula_id")
          .where("mtd.turma_disciplina_id", avaliacao.oferta_id)
          .where((q) => q.whereIn("m.aluno_id", alunoIds).orWhereIn("mtd.id", matriculaIdsAlvo))
          .select("mtd.id", "m.id as matricula_id");
        const matriculaIds = matriculas.map((m) => String(m.id));
        const notas = await trx("piv.nota").where("avaliacao_id", avaliacaoId)
          .whereIn("matricula_turma_disciplina_id", matriculaIds).select("id");
        const autorizacoes = await trx("piv.nota_autorizacao_excepcional").where("avaliacao_id", avaliacaoId).select("id");
        return { cursos: [avaliacao.curso_id], disciplinas: [avaliacao.disciplina_id],
          periodos: [avaliacao.periodo_letivo_id], turmas: [avaliacao.turma_id], cursosDisciplinas: [avaliacao.matriz_id],
          professores: avaliacao.professor_id ? [avaliacao.professor_id] : [],
          ofertas: [avaliacao.oferta_id], avaliacoes: [avaliacaoId],
          matriculas: matriculas.map((m) => String(m.matricula_id)), matriculasDisciplinas: matriculaIds,
          notas: notas.map((n) => String(n.id)), autorizacoes: autorizacoes.map((a) => String(a.id)) };
      },
    }, callback);
  }

  buscarProfessorPorUsuarioId(usuarioId: string, executor: Executor = this.banco) {
    return executor("piv.professor").where({ usuario_id: usuarioId }).first();
  }
  buscarAlunoPorUsuarioId(usuarioId: string, executor: Executor = this.banco) {
    return executor("piv.aluno").where({ usuario_id: usuarioId }).first();
  }
  professorPossuiTurma(professorId: string, turmaDisciplinaId: string, executor: Executor = this.banco) {
    return executor("piv.turma_disciplina")
      .where({ id: turmaDisciplinaId, professor_id: professorId })
      .whereIn("status", STATUS_ATIVO)
      .first()
      .then(Boolean);
  }
  professorPossuiAluno(professorId: string, alunoId: string, executor: Executor = this.banco) {
    return executor("piv.turma_disciplina as td")
      .join("piv.matricula_turma_disciplina as mtd", "mtd.turma_disciplina_id", "td.id")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .where("td.professor_id", professorId)
      .where("m.aluno_id", alunoId)
      .whereIn("td.status", STATUS_ATIVO)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_MATRICULA_EM_CURSO)
      .first()
      .then(Boolean);
  }

  // Atribuicoes (turma/disciplina) com periodo letivo e disciplina.
  listarAtribuicoes(professorId?: string, executor: Executor = this.banco) {
    const q = executor("piv.turma_disciplina as td")
      .join("piv.turma as t", "td.turma_id", "t.id")
      .join("piv.periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
      .join("piv.professor as prof", "td.professor_id", "prof.id")
      .join("piv.pessoa as p", "prof.pessoa_id", "p.id")
      .whereIn("td.status", STATUS_ATIVO)
      .select(
        "td.id",
        "td.professor_id",
        "t.id as turma_id",
        "t.sigla as turma_sigla",
        "t.descricao as turma_descricao",
        "pl.id as periodo_id",
        "pl.codigo as periodo_codigo",
        "pl.status as periodo_status",
        "pl.ativo as periodo_ativo",
        "d.id as disciplina_id",
        "d.codigo as disciplina_codigo",
        "d.nome as disciplina_nome",
        "p.nome as professor_nome",
      )
      .orderBy(["t.sigla", "d.nome"]);
    if (professorId) q.where("td.professor_id", professorId);
    return q;
  }

  buscarTurmaDisciplina(turmaDisciplinaId: string, executor: Executor = this.banco) {
    return executor("piv.turma_disciplina as td")
      .join("piv.turma as t", "td.turma_id", "t.id")
      .join("piv.periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
      .where("td.id", turmaDisciplinaId)
      .select(
        "td.id",
        "td.professor_id",
        "td.status",
        "t.id as turma_id",
        "t.sigla as turma_sigla",
        "t.descricao as turma_descricao",
        "pl.id as periodo_id",
        "pl.codigo as periodo_codigo",
        "pl.status as periodo_status",
        "pl.ativo as periodo_ativo",
        "d.id as disciplina_id",
        "d.codigo as disciplina_codigo",
        "d.nome as disciplina_nome",
      )
      .first();
  }

  // Avaliacao com sua atribuicao, periodo e disciplina.
  buscarAvaliacao(avaliacaoId: string, executor: Executor = this.banco) {
    return executor("piv.avaliacao as a")
      .join("piv.turma_disciplina as td", "a.turma_disciplina_id", "td.id")
      .join("piv.turma as t", "td.turma_id", "t.id")
      .join("piv.periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
      .where("a.id", avaliacaoId)
      .select(
        "a.id",
        "a.tipo_avaliacao",
        "a.descricao_avaliacao",
        "a.valor",
        "a.data_lancamento",
        "a.turma_disciplina_id",
        "td.professor_id",
        "td.status as turma_disciplina_status",
        "t.sigla as turma_sigla",
        "pl.id as periodo_id",
        "pl.codigo as periodo_codigo",
        "pl.status as periodo_status",
        "pl.ativo as periodo_ativo",
        "d.id as disciplina_id",
        "d.nome as disciplina_nome",
      )
      .first();
  }

  listarAvaliacoesDaTurma(turmaDisciplinaId: string, executor: Executor = this.banco) {
    return executor("piv.avaliacao")
      .where("turma_disciplina_id", turmaDisciplinaId)
      .select("id", "tipo_avaliacao", "descricao_avaliacao", "valor", "data_lancamento")
      .orderBy("data_lancamento", "asc");
  }

  buscarRecuperacaoDaTurma(turmaDisciplinaId: string, executor: Executor = this.banco) {
    return executor("piv.avaliacao")
      .where({ turma_disciplina_id: turmaDisciplinaId, tipo_avaliacao: "RECUPERACAO" })
      .first();
  }

  async criarRecuperacao(turmaDisciplinaId: string, totalPontos: string, executor: Executor) {
    const [row] = await executor("piv.avaliacao")
      .insert({
        tipo_avaliacao: "RECUPERACAO",
        descricao_avaliacao: "Recuperação",
        valor: totalPontos,
        subgrupo_id: null,
        turma_disciplina_id: turmaDisciplinaId,
      })
      .returning("*");
    return row;
  }

  // Matriculas ativas (status regular em matricula e na atribuicao).
  listarMatriculasAtivas(turmaDisciplinaId: string, executor: Executor = this.banco) {
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.aluno as a", "m.aluno_id", "a.id")
      .join("piv.pessoa as p", "a.pessoa_id", "p.id")
      .where("mtd.turma_disciplina_id", turmaDisciplinaId)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_MATRICULA_EM_CURSO)
      .select(
        "mtd.id as matricula_turma_disciplina_id",
        "mtd.status as status_matricula",
        "a.id as aluno_id",
        "a.matricula",
        "p.nome as aluno_nome",
      )
      .orderBy("p.nome");
  }

  async contarMatriculasIrregulares(turmaDisciplinaId: string, executor: Executor = this.banco) {
    const [{ total }] = await executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .where("mtd.turma_disciplina_id", turmaDisciplinaId)
      .where((q) => q.whereNotIn("mtd.status", STATUS_ATIVO).orWhereNotIn("m.status", STATUS_MATRICULA_EM_CURSO))
      .count("mtd.id as total");
    return Number(total || 0);
  }

  listarNotasDaAvaliacao(avaliacaoId: string, executor: Executor = this.banco) {
    return executor("piv.nota").where("avaliacao_id", avaliacaoId).select("*");
  }

  // Todas as notas das avaliacoes de uma turma/disciplina (sem N+1).
  listarNotasDaTurma(turmaDisciplinaId: string, executor: Executor = this.banco) {
    return executor("piv.nota as n")
      .join("piv.avaliacao as a", "n.avaliacao_id", "a.id")
      .where("a.turma_disciplina_id", turmaDisciplinaId)
      .select("n.avaliacao_id", "n.matricula_turma_disciplina_id", "n.valor", "n.publicada_em");
  }

  /** Identidades de matrícula previamente autorizadas; mantém vínculo visível para validar integridade. */
  async listarNotasEmLote(matriculaIds: string[], executor: Executor): Promise<Array<{
    avaliacao_id: string; matricula_turma_disciplina_id: string; turma_disciplina_id: string; valor: string;
  }>> {
    if (matriculaIds.length === 0) return [];
    const linhas = await executor("piv.nota as n")
      .join("piv.avaliacao as a", "a.id", "n.avaliacao_id")
      .whereIn("n.matricula_turma_disciplina_id", matriculaIds)
      .select("n.avaliacao_id", "n.matricula_turma_disciplina_id", "a.turma_disciplina_id", "n.valor");
    return linhas.map((n) => ({ ...n, valor: formatarPontos(parsePontos(String(n.valor))) }));
  }

  // Disciplinas em que o aluno esta matriculado (mesmo sem notas).
  listarTurmasDoAluno(alunoId: string, periodoId?: string, executor: Executor = this.banco) {
    const q = executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("piv.turma as t", "td.turma_id", "t.id")
      .join("piv.periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
      .join("piv.professor as prof", "td.professor_id", "prof.id")
      .join("piv.pessoa as p", "prof.pessoa_id", "p.id")
      .where("m.aluno_id", alunoId)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_MATRICULA_EM_CURSO)
      .select(
        "mtd.id as matricula_turma_disciplina_id",
        "mtd.status as status_matricula",
        "td.id as turma_disciplina_id",
        "t.sigla as turma_sigla",
        "pl.id as periodo_id",
        "pl.codigo as periodo_codigo",
        "d.id as disciplina_id",
        "d.codigo as disciplina_codigo",
        "d.nome as disciplina_nome",
        "p.nome as professor_nome",
      )
      .orderBy("d.nome");
    if (periodoId) q.where("pl.id", periodoId);
    return q;
  }

  listarPeriodosDoAluno(alunoId: string, executor: Executor = this.banco) {
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("piv.turma as t", "td.turma_id", "t.id")
      .join("piv.periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .where("m.aluno_id", alunoId)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_MATRICULA_EM_CURSO)
      .distinct("pl.id as periodo_id", "pl.codigo as periodo_codigo", "pl.status as periodo_status")
      .orderBy("pl.codigo", "desc");
  }

  // Avaliacoes e notas de todas as turmas do aluno (consulta unica).
  listarBoletimDoAluno(alunoId: string, executor: Executor = this.banco) {
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.avaliacao as a", "a.turma_disciplina_id", "mtd.turma_disciplina_id")
      .leftJoin("piv.nota as n", (join) =>
        join.on("n.avaliacao_id", "a.id").andOn("n.matricula_turma_disciplina_id", "mtd.id"),
      )
      .where("m.aluno_id", alunoId)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_MATRICULA_EM_CURSO)
      .select(
        "mtd.id as matricula_turma_disciplina_id",
        "mtd.turma_disciplina_id",
        "a.id as avaliacao_id",
        "a.tipo_avaliacao",
        "a.descricao_avaliacao",
        "a.valor",
        "a.data_lancamento",
        "n.valor as nota_valor",
        "n.publicada_em",
      );
  }

  // Avaliacoes (com nota do aluno, se ja publicada) das turmas-disciplina informadas, para montar a ficha.
  buscarAvaliacoesParaFicha(matriculaTurmaDisciplinaIds: string[], executor: Executor = this.banco) {
    if (!matriculaTurmaDisciplinaIds || matriculaTurmaDisciplinaIds.length === 0) {
      return Promise.resolve([]);
    }
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.avaliacao as av", "av.turma_disciplina_id", "mtd.turma_disciplina_id")
      .join("piv.turma_disciplina as td", "av.turma_disciplina_id", "td.id")
      .join("piv.turma as t", "td.turma_id", "t.id")
      .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
      .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
      .join("piv.professor as pr", "td.professor_id", "pr.id")
      .join("piv.pessoa as pp", "pr.pessoa_id", "pp.id")
      .leftJoin("piv.nota as n", (join) =>
        join.on("n.avaliacao_id", "av.id").andOn("n.matricula_turma_disciplina_id", "mtd.id"),
      )
      .whereIn("mtd.id", matriculaTurmaDisciplinaIds)
      .select(
        "av.id",
        "av.tipo_avaliacao",
        "av.descricao_avaliacao",
        "av.valor",
        "n.valor as nota",
        "mtd.id as matricula_turma_disciplina_id",
        "t.id as turma_id",
        "t.sigla as turma_sigla",
        "t.descricao as turma_descricao",
        "d.id as disciplina_id",
        "d.nome as disciplina_nome",
        "pr.id as professor_id",
        "pp.nome as professor_nome",
      );
  }

  buscarAlunoDono(matriculaTurmaDisciplinaId: string, executor: Executor = this.banco) {
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .where("mtd.id", matriculaTurmaDisciplinaId)
      .select("m.aluno_id")
      .first();
  }

  buscarVinculoPorId(matriculaId: string, executor: Executor = this.banco) {
    return executor("piv.matricula_turma_disciplina").where({ id: matriculaId })
      .first("id", "turma_disciplina_id", "status");
  }

  // Autorizacao excepcional vigente da secretaria para a avaliacao (RN-13).
  buscarAutorizacaoVigente(avaliacaoId: string, matriculaId?: string, executor: Executor = this.banco) {
    return executor("piv.nota_autorizacao_excepcional")
      .where("avaliacao_id", avaliacaoId)
      .whereNull("utilizada_em")
      .where("expira_em", ">", executor.raw("clock_timestamp()"))
      .where((q) =>
        q.whereNull("matricula_turma_disciplina_id").orWhere(
          "matricula_turma_disciplina_id",
          matriculaId ?? "",
        ),
      )
      .orderBy("expira_em", "desc")
      .first();
  }

  async criarAutorizacaoExcepcional(
    dados: { avaliacaoId: string; matriculaTurmaDisciplinaId?: string; motivo: string; usuarioId: string; expiraEm: Date },
    executor: Executor = this.banco,
  ) {
    const avaliacao = await this.buscarAvaliacao(dados.avaliacaoId, executor);
    if (!avaliacao) throw erroNota.naoEncontrado("Avaliação não encontrada.");
    if (avaliacao.periodo_ativo === false || ["fechado", "encerrado", "concluido", "inativo"].includes(String(avaliacao.periodo_status).toLowerCase())) {
      throw erroNota.conflito("Período fechado bloqueia autorização de retificação.", "PERIODO_FECHADO");
    }
    if (dados.matriculaTurmaDisciplinaId) {
      const matricula = await executor("piv.matricula_turma_disciplina")
        .where({ id: dados.matriculaTurmaDisciplinaId, turma_disciplina_id: avaliacao.turma_disciplina_id }).first("id");
      if (!matricula) throw erroNota.invalido("A matrícula informada não pertence à avaliação.", "LOTE_INVALIDO",
        [{ campo: "matriculaTurmaDisciplinaId", codigo: "LOTE_INVALIDO", mensagem: "Informe uma matrícula da oferta desta avaliação." }]);
    }
    const [row] = await executor("piv.nota_autorizacao_excepcional")
      .insert({
        avaliacao_id: dados.avaliacaoId,
        matricula_turma_disciplina_id: dados.matriculaTurmaDisciplinaId || null,
        motivo: dados.motivo,
        autorizada_por_usuario_id: dados.usuarioId,
        expira_em: dados.expiraEm,
      })
      .returning("*");
    return row;
  }

  // Recebe exclusivamente a transação aberta por T010; nenhuma transação aninhada.
  async salvarLoteAtomico(args: SalvarLoteArgs, trx: Knex.Transaction) {
    if (!trx?.isTransaction) throw new TypeError("O lote exige o executor transacional de notas.");
    const avaliacao = await this.buscarAvaliacao(args.avaliacaoId, trx);
    if (!avaliacao) throw erroNota.naoEncontrado("Avaliação não encontrada.");
    if (avaliacao.periodo_ativo === false || ["fechado", "encerrado", "concluido", "inativo"].includes(String(avaliacao.periodo_status).toLowerCase())) {
      throw erroNota.conflito("Período letivo fechado bloqueia alterações de nota.", "PERIODO_FECHADO");
    }
    if (args.perfil === "professor") {
      const professor = await this.buscarProfessorPorUsuarioId(args.usuarioId, trx);
      if (!professor?.id || professor.ativo === false || String(professor.id) !== String(avaliacao.professor_id)
        || !(await this.professorPossuiTurma(professor.id, avaliacao.turma_disciplina_id, trx))) {
        throw erroNota.proibido("Oferta fora das atribuições do professor.", "ESCOPO_PROIBIDO");
      }
    } else if (!["administrador", "secretaria"].includes(args.perfil)) throw erroNota.proibido();
    const maximo = parsePontos(String(avaliacao.valor));
    const elegiveis = await this.listarMatriculasAtivas(avaliacao.turma_disciplina_id, trx);
    const matriculaIds = new Set(elegiveis.map((m) => String(m.matricula_turma_disciplina_id)));
    const existentes = await this.listarNotasDaAvaliacao(args.avaliacaoId, trx);
    const porMatricula = new Map(existentes.map((n) => [String(n.matricula_turma_disciplina_id), n]));
    const autorizacoesUsadas = new Set<string>();
    const preparados: Array<{ item: SalvarLoteArgs["itens"][number]; anterior: any; autorizacao: any }> = [];

    // Valida todo o lote antes da primeira nota/auditoria/consumo de autorização.
    const repetidos = new Set<string>();
    for (const item of args.itens) {
      if (!matriculaIds.has(item.matriculaId) || repetidos.has(item.matriculaId)) {
        throw erroNota.invalido("O lote contém matrícula inválida ou repetida.");
      }
      repetidos.add(item.matriculaId);
      const valor = parsePontos(item.valor);
      if (valor > maximo) throw erroNota.invalido("A nota excede o máximo desta avaliação.", "VALOR_INVALIDO");
      const anterior = porMatricula.get(item.matriculaId);
      let autorizacao: any = null;
      if (anterior && Date.now() > new Date(anterior.publicada_em).getTime() + 7 * 86400000) {
        autorizacao = await this.buscarAutorizacaoVigente(args.avaliacaoId, item.matriculaId, trx);
        if (!autorizacao) throw erroNota.conflito("Prazo de retificação de 7 dias expirado. Necessária autorização da secretaria.", "PRAZO_EXPIRADO");
        autorizacoesUsadas.add(String(autorizacao.id));
      }
      preparados.push({ item: { ...item, valor: formatarPontos(valor) }, anterior, autorizacao });
    }

    const ids: string[] = [];
    for (const { item, anterior, autorizacao } of preparados) {
      if (anterior) {
        const [atual] = await trx("piv.nota").where({ id: anterior.id })
          .update({ valor: item.valor, atualizada_por_usuario_id: args.usuarioId, updated_at: trx.raw("clock_timestamp()") }).returning("*");
        ids.push(atual.id);
        await this.auditar(trx, atual.id, args, "RETIFICACAO", anterior.valor, atual.valor, args.motivo ?? autorizacao?.motivo ?? null);
      } else {
        const [novo] = await trx("piv.nota").insert({ avaliacao_id: args.avaliacaoId,
          matricula_turma_disciplina_id: item.matriculaId, valor: item.valor,
          criada_por_usuario_id: args.usuarioId, atualizada_por_usuario_id: args.usuarioId,
          publicada_em: trx.raw("clock_timestamp()") }).returning("*");
        ids.push(novo.id);
        await this.auditar(trx, novo.id, args, "LANCAMENTO", null, novo.valor, args.motivo ?? null);
      }
    }
    if (autorizacoesUsadas.size > 0) {
      await trx("piv.nota_autorizacao_excepcional").whereIn("id", [...autorizacoesUsadas])
        .update({ utilizada_em: trx.raw("clock_timestamp()"), updated_at: trx.raw("clock_timestamp()") });
    }
    return trx("piv.nota").whereIn("id", ids).select("*");
  }

  private auditar(
    trx: Knex.Transaction,
    notaId: string,
    args: SalvarLoteArgs,
    acao: string,
    valorAnterior: string | null,
    valorNovo: string,
    motivo: string | null,
  ) {
    return trx("piv.nota_auditoria").insert({
      nota_id: notaId,
      usuario_id: args.usuarioId,
      perfil: args.perfil,
      acao,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      motivo,
      criado_em: trx.raw("clock_timestamp()"),
    });
  }
}

export const ehRegular = (tipo: string) => REGULARES.includes(tipo);
