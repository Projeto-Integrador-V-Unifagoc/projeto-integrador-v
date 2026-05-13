import db from "../../../database/index.js";
import { FrequenciaMapper, StatusFrequencia } from "../models/Frequencia";

export class FrequenciaRepository {
  async buscarProfessorPorUsuarioId(usuarioId: string) {
    return db("professor").where({ usuario_id: usuarioId }).first();
  }

  async buscarAlunoPorUsuarioId(usuarioId: string) {
    return db("aluno").where({ usuario_id: usuarioId }).first();
  }

  async buscarProfessorPadraoParaFrequencia() {
    const professorComTurma = await db("professor")
      .join("turma", "professor.id", "turma.professor_id")
      .select("professor.*")
      .first();

    if (professorComTurma) {
      return professorComTurma;
    }

    return db("professor").first();
  }

  async professorPossuiTurma(professorId: string, turmaId: string) {
    const turma = await db("turma")
      .where({ id: turmaId, professor_id: professorId })
      .first();
    return Boolean(turma);
  }

  async listarTurmasDoProfessor(professorId?: string) {
    const query = db("turma")
      .join("disciplinas", "turma.disciplina_id", "disciplinas.id")
      .join("curso", "turma.curso_id", "curso.id")
      .select(
        "turma.id",
        "turma.semestre",
        "turma.professor_id",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
        "disciplinas.codigo as disciplina_codigo",
        "curso.id as curso_id",
        "curso.nome as curso_nome",
      )
      .orderBy("disciplinas.nome");

    if (professorId) query.where("turma.professor_id", professorId);
    return query;
  }

  async listarAlunosAtivosDaTurma(turmaId: string) {
    return db("aluno_turma")
      .join("aluno", "aluno_turma.aluno_id", "aluno.id")
      .join("pessoa", "aluno.pessoa_id", "pessoa.id")
      .where("aluno_turma.turma_id", turmaId)
      .whereIn("aluno_turma.status", ["ATIVO", "MATRICULADO", "REGULAR"])
      .select(
        "aluno.id as aluno_id",
        "aluno.matricula",
        "pessoa.nome",
        "aluno_turma.status",
        "aluno_turma.frequencia",
      )
      .orderBy("pessoa.nome");
  }

  async listarTurmasDoAluno(alunoId: string) {
    return db("aluno_turma")
      .join("aluno", "aluno_turma.aluno_id", "aluno.id")
      .join("pessoa", "aluno.pessoa_id", "pessoa.id")
      .join("turma", "aluno_turma.turma_id", "turma.id")
      .join("disciplinas", "turma.disciplina_id", "disciplinas.id")
      .where("aluno_turma.aluno_id", alunoId)
      .whereIn("aluno_turma.status", ["ATIVO", "MATRICULADO", "REGULAR"])
      .select(
        "aluno.id as aluno_id",
        "pessoa.nome as aluno_nome",
        "turma.id as turma_id",
        "turma.semestre",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
      )
      .orderBy("disciplinas.nome");
  }

  async buscarTurma(turmaId: string) {
    return db("turma")
      .join("disciplinas", "turma.disciplina_id", "disciplinas.id")
      .where("turma.id", turmaId)
      .select(
        "turma.*",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
      )
      .first();
  }

  async obterOuCriarAula(turmaId: string, data: Date, professorId: string) {
    const dataAula = data.toISOString().slice(0, 10);
    const aulaExistente = await db("aula")
      .where("turma_id", turmaId)
      .whereRaw("DATE(data) = ?", [dataAula])
      .first();
    if (aulaExistente) return aulaExistente;

    const local = await this.obterOuCriarLocalPadrao();
    const [aula] = await db("aula")
      .insert({
        turma_id: turmaId,
        professor_id: professorId,
        local_id: local.id,
        data,
      })
      .returning("*");
    return aula;
  }

  async buscarAulaPorId(aulaId: string) {
    return db("aula").where("id", aulaId).first();
  }

  async obterOuCriarLocalPadrao() {
    const codigo = "SALA-FREQ-MOCK";
    const local = await db("local").where({ codigo }).first();
    if (local) return local;

    const [novoLocal] = await db("local").insert({ codigo }).returning("*");
    return novoLocal;
  }

  async buscarRegistroPorAulaEAluno(aulaId: string, alunoId: string) {
    const row = await db("frequencia")
      .where({ aula_id: aulaId, aluno_id: alunoId })
      .first();
    return row ? FrequenciaMapper.registro(row) : null;
  }

  async criarRegistros(registros: any[]) {
    if (!registros.length) return [];

    const rows = await db("frequencia")
      .insert(registros)
      .onConflict(["aula_id", "aluno_id"])
      .merge({
        status: db.raw("excluded.status"),
        turma_id: db.raw("excluded.turma_id"),
        data: db.raw("excluded.data"),
        responsavel_lancamento_id: db.raw("excluded.responsavel_lancamento_id"),
        atualizado_em: db.fn.now(),
      })
      .returning("*");
    return rows.map(FrequenciaMapper.registro);
  }

  async buscarRegistroPorId(id: string) {
    const row = await db("frequencia").where({ id }).first();
    return row ? FrequenciaMapper.registro(row) : null;
  }

  async atualizarRegistro(id: string, status: StatusFrequencia) {
    const [row] = await db("frequencia")
      .where({ id })
      .update({ status, atualizado_em: db.fn.now() })
      .returning("*");
    return row ? FrequenciaMapper.registro(row) : null;
  }

  async atualizarJustificativa(id: string, justificativa: string) {
    const [row] = await db("frequencia")
      .where({ id })
      .update({ justificativa, atualizado_em: db.fn.now() })
      .returning("*");
    return row ? FrequenciaMapper.registro(row) : null;
  }

  async removerRegistro(id: string) {
    await db("frequencia").where({ id }).del();
  }

  async listarRegistrosDaChamada(turmaId: string, data: string) {
    return db("frequencia")
      .join("aluno", "frequencia.aluno_id", "aluno.id")
      .join("pessoa", "aluno.pessoa_id", "pessoa.id")
      .where("frequencia.turma_id", turmaId)
      .where("frequencia.data", data)
      .select("frequencia.*", "pessoa.nome as aluno_nome", "aluno.matricula")
      .orderBy("pessoa.nome");
  }

  async buscarConsolidadoTurma(
    turmaId: string,
    filtros?: { dataInicio?: string; dataFim?: string },
  ) {
    const totalAulasQuery = db("aula")
      .where("turma_id", turmaId)
      .countDistinct("id as total");

    const registrosQuery = db("aluno_turma")
      .join("aluno", "aluno_turma.aluno_id", "aluno.id")
      .join("pessoa", "aluno.pessoa_id", "pessoa.id")
      .join("turma", "aluno_turma.turma_id", "turma.id")
      .join("disciplinas", "turma.disciplina_id", "disciplinas.id")
      .leftJoin("frequencia", function () {
        this.on("frequencia.aluno_id", "=", "aluno_turma.aluno_id")
          .andOn("frequencia.turma_id", "=", "aluno_turma.turma_id");

        if (filtros?.dataInicio) {
          this.andOn("frequencia.data", ">=", db.raw("?", [filtros.dataInicio]));
        }
        if (filtros?.dataFim) {
          this.andOn("frequencia.data", "<=", db.raw("?", [filtros.dataFim]));
        }
      })
      .where("aluno_turma.turma_id", turmaId)
      .whereIn("aluno_turma.status", ["ATIVO", "MATRICULADO", "REGULAR"]);

    if (filtros?.dataInicio) {
      totalAulasQuery.whereRaw("DATE(data) >= ?", [filtros.dataInicio]);
    }
    if (filtros?.dataFim) {
      totalAulasQuery.whereRaw("DATE(data) <= ?", [filtros.dataFim]);
    }

    const [{ total }] = await totalAulasQuery;
    const rows = await registrosQuery
      .groupBy(
        "aluno.id",
        "pessoa.nome",
        "turma.id",
        "disciplinas.id",
        "disciplinas.nome",
      )
      .select(
        "aluno.id as aluno_id",
        "pessoa.nome as aluno_nome",
        "turma.id as turma_id",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
      )
      .sum({
        presencas: db.raw(
          "CASE WHEN frequencia.status = 'PRESENTE' THEN 1 ELSE 0 END",
        ),
      });
    return { totalAulas: Number(total || 0), rows };
  }

  async listarHistoricoAluno(alunoId: string) {
    return db("frequencia")
      .join("aula", "frequencia.aula_id", "aula.id")
      .join("turma", "frequencia.turma_id", "turma.id")
      .join("disciplinas", "turma.disciplina_id", "disciplinas.id")
      .join("aluno", "frequencia.aluno_id", "aluno.id")
      .join("pessoa", "aluno.pessoa_id", "pessoa.id")
      .where("frequencia.aluno_id", alunoId)
      .select(
        "frequencia.*",
        "aula.data as aula_data",
        "pessoa.nome as aluno_nome",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
        "turma.id as turma_id",
        "turma.semestre",
      )
      .orderBy("aula.data", "desc");
  }

  async recalcularPercentualAlunoTurma(alunoId: string, turmaId: string) {
    const [totais] = await db("frequencia")
      .where({ aluno_id: alunoId, turma_id: turmaId })
      .count("id as total")
      .sum({
        presencas: db.raw("CASE WHEN status = 'PRESENTE' THEN 1 ELSE 0 END"),
      });
    const total = Number(totais.total || 0);
    const presencas = Number(totais.presencas || 0);
    const percentual =
      total === 0 ? 100 : Number(((presencas / total) * 100).toFixed(2));
    await db("aluno_turma")
      .where({ aluno_id: alunoId, turma_id: turmaId })
      .update({ frequencia: percentual });
    return percentual;
  }
}
