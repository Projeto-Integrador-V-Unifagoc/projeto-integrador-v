import type { Knex } from "knex";
import db from "../../../database/index.js";

type Executor = Knex | Knex.Transaction;

const STATUS_ATIVO = ["ativa", "ATIVA", "ATIVO", "MATRICULADO", "REGULAR"];
const REGULARES = ["PROVA", "TPI", "TRABALHO"];

export interface SalvarLoteArgs {
  avaliacaoId: string;
  usuarioId: string;
  perfil: string;
  itens: Array<{ matriculaId: string; valor: number }>;
}

export class NotaRepository {
  transacao<T>(callback: (trx: Knex.Transaction) => Promise<T>) {
    return db.transaction(callback);
  }

  buscarProfessorPorUsuarioId(usuarioId: string) {
    return db("piv.professor").where({ usuario_id: usuarioId }).first();
  }
  buscarAlunoPorUsuarioId(usuarioId: string) {
    return db("piv.aluno").where({ usuario_id: usuarioId }).first();
  }
  professorPossuiTurma(professorId: string, turmaDisciplinaId: string) {
    return db("piv.turma_disciplina")
      .where({ id: turmaDisciplinaId, professor_id: professorId })
      .whereIn("status", STATUS_ATIVO)
      .first()
      .then(Boolean);
  }
  professorPossuiAluno(professorId: string, alunoId: string) {
    return db("piv.turma_disciplina as td")
      .join("piv.matricula_turma_disciplina as mtd", "mtd.turma_disciplina_id", "td.id")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .where("td.professor_id", professorId)
      .where("m.aluno_id", alunoId)
      .whereIn("td.status", STATUS_ATIVO)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_ATIVO)
      .first()
      .then(Boolean);
  }

  // Atribuicoes (turma/disciplina) com periodo letivo e disciplina.
  listarAtribuicoes(professorId?: string, executor: Executor = db) {
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

  buscarTurmaDisciplina(turmaDisciplinaId: string, executor: Executor = db) {
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
  buscarAvaliacao(avaliacaoId: string, executor: Executor = db) {
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

  listarAvaliacoesDaTurma(turmaDisciplinaId: string, executor: Executor = db) {
    return executor("piv.avaliacao")
      .where("turma_disciplina_id", turmaDisciplinaId)
      .select("id", "tipo_avaliacao", "descricao_avaliacao", "valor", "data_lancamento")
      .orderBy("data_lancamento", "asc");
  }

  buscarRecuperacaoDaTurma(turmaDisciplinaId: string, executor: Executor = db) {
    return executor("piv.avaliacao")
      .where({ turma_disciplina_id: turmaDisciplinaId, tipo_avaliacao: "RECUPERACAO" })
      .first();
  }

  async criarRecuperacao(turmaDisciplinaId: string, executor: Executor = db) {
    const [row] = await executor("piv.avaliacao")
      .insert({
        tipo_avaliacao: "RECUPERACAO",
        descricao_avaliacao: "Recuperação",
        valor: 100,
        turma_disciplina_id: turmaDisciplinaId,
      })
      .returning("*");
    return row;
  }

  // Matriculas ativas (status regular em matricula e na atribuicao).
  listarMatriculasAtivas(turmaDisciplinaId: string, executor: Executor = db) {
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.aluno as a", "m.aluno_id", "a.id")
      .join("piv.pessoa as p", "a.pessoa_id", "p.id")
      .where("mtd.turma_disciplina_id", turmaDisciplinaId)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_ATIVO)
      .select(
        "mtd.id as matricula_turma_disciplina_id",
        "mtd.status as status_matricula",
        "a.id as aluno_id",
        "a.matricula",
        "p.nome as aluno_nome",
      )
      .orderBy("p.nome");
  }

  async contarMatriculasIrregulares(turmaDisciplinaId: string, executor: Executor = db) {
    const [{ total }] = await executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .where("mtd.turma_disciplina_id", turmaDisciplinaId)
      .where((q) => q.whereNotIn("mtd.status", STATUS_ATIVO).orWhereNotIn("m.status", STATUS_ATIVO))
      .count("mtd.id as total");
    return Number(total || 0);
  }

  listarNotasDaAvaliacao(avaliacaoId: string, executor: Executor = db) {
    return executor("piv.nota").where("avaliacao_id", avaliacaoId).select("*");
  }

  // Todas as notas das avaliacoes de uma turma/disciplina (sem N+1).
  listarNotasDaTurma(turmaDisciplinaId: string, executor: Executor = db) {
    return executor("piv.nota as n")
      .join("piv.avaliacao as a", "n.avaliacao_id", "a.id")
      .where("a.turma_disciplina_id", turmaDisciplinaId)
      .select("n.avaliacao_id", "n.matricula_turma_disciplina_id", "n.valor", "n.publicada_em");
  }

  // Disciplinas em que o aluno esta matriculado (mesmo sem notas).
  listarTurmasDoAluno(alunoId: string, periodoId?: string, executor: Executor = db) {
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
      .whereIn("m.status", STATUS_ATIVO)
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

  listarPeriodosDoAluno(alunoId: string, executor: Executor = db) {
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
      .join("piv.turma as t", "td.turma_id", "t.id")
      .join("piv.periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
      .where("m.aluno_id", alunoId)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_ATIVO)
      .distinct("pl.id as periodo_id", "pl.codigo as periodo_codigo", "pl.status as periodo_status")
      .orderBy("pl.codigo", "desc");
  }

  // Avaliacoes e notas de todas as turmas do aluno (consulta unica).
  listarBoletimDoAluno(alunoId: string, executor: Executor = db) {
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .join("piv.avaliacao as a", "a.turma_disciplina_id", "mtd.turma_disciplina_id")
      .leftJoin("piv.nota as n", (join) =>
        join.on("n.avaliacao_id", "a.id").andOn("n.matricula_turma_disciplina_id", "mtd.id"),
      )
      .where("m.aluno_id", alunoId)
      .whereIn("mtd.status", STATUS_ATIVO)
      .whereIn("m.status", STATUS_ATIVO)
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

  buscarAlunoDono(matriculaTurmaDisciplinaId: string, executor: Executor = db) {
    return executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .where("mtd.id", matriculaTurmaDisciplinaId)
      .select("m.aluno_id")
      .first();
  }

  // Autorizacao excepcional vigente da secretaria para a avaliacao (RN-13).
  buscarAutorizacaoVigente(avaliacaoId: string, matriculaId?: string, executor: Executor = db) {
    return executor("piv.nota_autorizacao_excepcional")
      .where("avaliacao_id", avaliacaoId)
      .whereNull("utilizada_em")
      .where("expira_em", ">", db.fn.now())
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
    executor: Executor = db,
  ) {
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

  // Upsert atomico do lote, com auditoria e protecao contra concorrencia (secao 8).
  async salvarLoteAtomico(args: SalvarLoteArgs) {
    return db.transaction(async (trx) => {
      const avaliacao = await trx("piv.avaliacao").where({ id: args.avaliacaoId }).forUpdate().first();
      if (!avaliacao) throw Object.assign(new Error("Avaliação não encontrada."), { codigoDominio: "NAO_ENCONTRADO" });
      const maximo = Number(avaliacao.valor);

      const matriculaIds = args.itens.map((i) => i.matriculaId);
      const existentes = await trx("piv.nota")
        .where("avaliacao_id", args.avaliacaoId)
        .whereIn("matricula_turma_disciplina_id", matriculaIds)
        .forUpdate();
      const porMatricula = new Map(existentes.map((r) => [String(r.matricula_turma_disciplina_id), r]));
      const autorizacoesUsadas = new Set<string>();

      const ids: string[] = [];
      for (const item of args.itens) {
        if (Number(item.valor) > maximo) {
          throw Object.assign(new Error(`Nota acima do máximo (${maximo}) da avaliação.`), { codigoDominio: "VALOR_INVALIDO" });
        }
        const anterior = porMatricula.get(item.matriculaId);
        if (anterior) {
          const limite = new Date(anterior.publicada_em).getTime() + 7 * 86400000;
          let autorizacao: any = null;
          if (Date.now() > limite) {
            autorizacao = await this.buscarAutorizacaoVigente(args.avaliacaoId, item.matriculaId, trx);
            if (!autorizacao) {
              throw Object.assign(new Error("Prazo de retificação de 7 dias expirado. Necessária autorização da secretaria."), { codigoDominio: "PRAZO_EXPIRADO" });
            }
            autorizacoesUsadas.add(String(autorizacao.id));
          }
          const [atual] = await trx("piv.nota")
            .where({ id: anterior.id })
            .update({ valor: item.valor, atualizada_por_usuario_id: args.usuarioId, updated_at: trx.fn.now() })
            .returning("*");
          ids.push(atual.id);
          await this.auditar(trx, atual.id, args, "RETIFICACAO", anterior.valor, atual.valor, autorizacao?.motivo ?? null);
        } else {
          const [novo] = await trx("piv.nota")
            .insert({
              avaliacao_id: args.avaliacaoId,
              matricula_turma_disciplina_id: item.matriculaId,
              valor: item.valor,
              criada_por_usuario_id: args.usuarioId,
              atualizada_por_usuario_id: args.usuarioId,
              publicada_em: trx.fn.now(),
            })
            .returning("*");
          ids.push(novo.id);
          await this.auditar(trx, novo.id, args, "LANCAMENTO", null, novo.valor, null);
        }
      }

      if (autorizacoesUsadas.size > 0) {
        await trx("piv.nota_autorizacao_excepcional")
          .whereIn("id", [...autorizacoesUsadas])
          .update({ utilizada_em: trx.fn.now(), updated_at: trx.fn.now() });
      }

      return trx("piv.nota").whereIn("id", ids).select("*");
    });
  }

  private auditar(
    trx: Knex.Transaction,
    notaId: string,
    args: SalvarLoteArgs,
    acao: string,
    valorAnterior: number | null,
    valorNovo: number,
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
    });
  }
}

export const ehRegular = (tipo: string) => REGULARES.includes(tipo);
