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
      .join("turma_disciplina", "professor.id", "turma_disciplina.professor_id")
      .select("professor.*")
      .first();

    if (professorComTurma) return professorComTurma;
    return db("professor").first();
  }

  async professorPossuiTurma(professorId: string, turmaDisciplinaId: string) {
    const turmaDisciplina = await db("turma_disciplina")
      .where({ id: turmaDisciplinaId, professor_id: professorId })
      .first();
    return Boolean(turmaDisciplina);
  }

  async listarTurmasDoProfessor(professorId?: string) {
    const query = db("turma_disciplina")
      .join("turma", "turma_disciplina.turma_id", "turma.id")
      .join("periodo_letivo", "turma.periodo_letivo_id", "periodo_letivo.id")
      .join("curso", "turma.curso_id", "curso.id")
      .join("curso_disciplina", "turma_disciplina.curso_disciplina_id", "curso_disciplina.id")
      .join("disciplinas", "curso_disciplina.disciplina_id", "disciplinas.id")
      .select(
        "turma_disciplina.id",
        "turma_disciplina.professor_id",
        "turma.id as turma_id",
        "turma.sigla as turma_sigla",
        "turma.descricao as turma_descricao",
        "periodo_letivo.ano",
        "periodo_letivo.semestre",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
        "disciplinas.codigo as disciplina_codigo",
        "curso.id as curso_id",
        "curso.nome as curso_nome",
      )
      .whereIn("turma_disciplina.status", ["ativa", "ATIVA"])
      .orderBy("disciplinas.nome");

    if (professorId) query.where("turma_disciplina.professor_id", professorId);
    return query;
  }

  async listarAlunosAtivosDaTurma(turmaDisciplinaId: string) {
    return db("matricula_turma_disciplina")
      .join("matricula", "matricula_turma_disciplina.matricula_id", "matricula.id")
      .join("aluno", "matricula.aluno_id", "aluno.id")
      .join("pessoa", "aluno.pessoa_id", "pessoa.id")
      .where("matricula_turma_disciplina.turma_disciplina_id", turmaDisciplinaId)
      .whereIn("matricula_turma_disciplina.status", ["ativa", "ATIVO", "MATRICULADO", "REGULAR"])
      .whereIn("matricula.status", ["ativa", "ATIVO", "MATRICULADO", "REGULAR"])
      .select(
        "matricula_turma_disciplina.id as matricula_turma_disciplina_id",
        "aluno.id as aluno_id",
        "aluno.matricula",
        "pessoa.nome",
        "matricula_turma_disciplina.status",
      )
      .orderBy("pessoa.nome");
  }

  async buscarTurma(turmaDisciplinaId: string) {
    return db("turma_disciplina")
      .join("turma", "turma_disciplina.turma_id", "turma.id")
      .join("curso_disciplina", "turma_disciplina.curso_disciplina_id", "curso_disciplina.id")
      .join("disciplinas", "curso_disciplina.disciplina_id", "disciplinas.id")
      .where("turma_disciplina.id", turmaDisciplinaId)
      .select(
        "turma_disciplina.*",
        "turma.id as turma_id",
        "turma.sigla as turma_sigla",
        "turma.descricao as turma_descricao",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
      )
      .first();
  }

  async obterOuCriarAula(turmaDisciplinaId: string, data: Date, professorId: string) {
    const dataAula = data.toISOString().slice(0, 10);
    const aulaExistente = await db("aula")
      .where("turma_disciplina_id", turmaDisciplinaId)
      .whereRaw("DATE(data) = ?", [dataAula])
      .first();
    if (aulaExistente) return aulaExistente;

    const local = await this.obterOuCriarLocalPadrao();
    const [aula] = await db("aula")
      .insert({
        turma_disciplina_id: turmaDisciplinaId,
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
    const codigo = "SALA-FREQ-PADRAO";
    const local = await db("local").where({ codigo }).first();
    if (local) return local;

    const [novoLocal] = await db("local").insert({ codigo }).returning("*");
    return novoLocal;
  }

  async buscarRegistroPorAulaEMatricula(aulaId: string, matriculaTurmaDisciplinaId: string) {
    const row = await this.baseRegistroQuery()
      .where("frequencia.aula_id", aulaId)
      .where("frequencia.matricula_turma_disciplina_id", matriculaTurmaDisciplinaId)
      .first();
    return row ? FrequenciaMapper.registro(row) : null;
  }

  async criarRegistros(registros: any[]) {
    const rows = await db("frequencia").insert(registros).returning("id");
    const ids = rows.map((row: any) => row.id || row);
    return this.listarRegistrosPorIds(ids);
  }

  async listarRegistrosPorIds(ids: string[]) {
    const rows = await this.baseRegistroQuery().whereIn("frequencia.id", ids);
    return rows.map(FrequenciaMapper.registro);
  }

  async buscarRegistroPorId(id: string) {
    const row = await this.baseRegistroQuery().where("frequencia.id", id).first();
    return row ? FrequenciaMapper.registro(row) : null;
  }

  async atualizarRegistro(id: string, status: StatusFrequencia) {
    const [row] = await db("frequencia")
      .where({ id })
      .update({ status, updated_at: db.fn.now() })
      .returning("id");
    const registroId = (row as any)?.id || row;
    return registroId ? this.buscarRegistroPorId(registroId) : null;
  }

  async atualizarJustificativa(id: string, justificativa: string) {
    const [row] = await db("frequencia")
      .where({ id })
      .update({ justificativa, updated_at: db.fn.now() })
      .returning("id");
    const registroId = (row as any)?.id || row;
    return registroId ? this.buscarRegistroPorId(registroId) : null;
  }

  async removerRegistro(id: string) {
    await db("frequencia").where({ id }).del();
  }

  async listarRegistrosDaChamada(turmaDisciplinaId: string, data: string) {
    return this.baseRegistroQuery()
      .where("matricula_turma_disciplina.turma_disciplina_id", turmaDisciplinaId)
      .where("frequencia.data", data)
      .orderBy("pessoa.nome");
  }

  async buscarConsolidadoTurma(
    turmaDisciplinaId: string,
    filtros?: { dataInicio?: string; dataFim?: string },
  ) {
    const totalAulasQuery = db("frequencia")
      .join(
        "matricula_turma_disciplina",
        "frequencia.matricula_turma_disciplina_id",
        "matricula_turma_disciplina.id",
      )
      .where("matricula_turma_disciplina.turma_disciplina_id", turmaDisciplinaId)
      .countDistinct("frequencia.aula_id as total");

    const registrosQuery = db("frequencia")
      .join(
        "matricula_turma_disciplina",
        "frequencia.matricula_turma_disciplina_id",
        "matricula_turma_disciplina.id",
      )
      .join("matricula", "matricula_turma_disciplina.matricula_id", "matricula.id")
      .join("aluno", "matricula.aluno_id", "aluno.id")
      .join("pessoa", "aluno.pessoa_id", "pessoa.id")
      .join(
        "turma_disciplina",
        "matricula_turma_disciplina.turma_disciplina_id",
        "turma_disciplina.id",
      )
      .join("curso_disciplina", "turma_disciplina.curso_disciplina_id", "curso_disciplina.id")
      .join("disciplinas", "curso_disciplina.disciplina_id", "disciplinas.id")
      .where("matricula_turma_disciplina.turma_disciplina_id", turmaDisciplinaId);

    if (filtros?.dataInicio) {
      totalAulasQuery.where("frequencia.data", ">=", filtros.dataInicio);
      registrosQuery.where("frequencia.data", ">=", filtros.dataInicio);
    }
    if (filtros?.dataFim) {
      totalAulasQuery.where("frequencia.data", "<=", filtros.dataFim);
      registrosQuery.where("frequencia.data", "<=", filtros.dataFim);
    }

    const [{ total }] = await totalAulasQuery;
    const rows = await registrosQuery
      .groupBy(
        "aluno.id",
        "pessoa.nome",
        "turma_disciplina.id",
        "disciplinas.id",
        "disciplinas.nome",
      )
      .select(
        "aluno.id as aluno_id",
        "pessoa.nome as aluno_nome",
        "turma_disciplina.id as turma_disciplina_id",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
      )
      .sum({
        presencas: db.raw("CASE WHEN frequencia.status = 'PRESENTE' THEN 1 ELSE 0 END"),
      });
    return { totalAulas: Number(total || 0), rows };
  }

  async listarHistoricoAluno(alunoId: string) {
    return this.baseRegistroQuery()
      .where("matricula.aluno_id", alunoId)
      .select("turma.sigla as turma_sigla", "turma.descricao as turma_descricao")
      .orderBy("aula.data", "desc");
  }

  async recalcularPercentualAlunoTurma(alunoId: string, turmaDisciplinaId: string) {
    const matriculaTurmaDisciplina = await db("matricula_turma_disciplina")
      .join("matricula", "matricula_turma_disciplina.matricula_id", "matricula.id")
      .where("matricula.aluno_id", alunoId)
      .where("matricula_turma_disciplina.turma_disciplina_id", turmaDisciplinaId)
      .select("matricula_turma_disciplina.id")
      .first();

    if (!matriculaTurmaDisciplina) return 100;
    return this.calcularPercentualMatriculaTurmaDisciplina(matriculaTurmaDisciplina.id);
  }

  async calcularPercentualMatriculaTurmaDisciplina(matriculaTurmaDisciplinaId: string) {
    const [totais] = await db("frequencia")
      .where({ matricula_turma_disciplina_id: matriculaTurmaDisciplinaId })
      .count("id as total")
      .sum({
        presencas: db.raw("CASE WHEN status = 'PRESENTE' THEN 1 ELSE 0 END"),
      });
    const total = Number(totais.total || 0);
    const presencas = Number(totais.presencas || 0);
    return total === 0 ? 100 : Number(((presencas / total) * 100).toFixed(2));
  }

  private baseRegistroQuery() {
    return db("frequencia")
      .join("aula", "frequencia.aula_id", "aula.id")
      .join(
        "matricula_turma_disciplina",
        "frequencia.matricula_turma_disciplina_id",
        "matricula_turma_disciplina.id",
      )
      .join("matricula", "matricula_turma_disciplina.matricula_id", "matricula.id")
      .join("aluno", "matricula.aluno_id", "aluno.id")
      .join("pessoa", "aluno.pessoa_id", "pessoa.id")
      .join(
        "turma_disciplina",
        "matricula_turma_disciplina.turma_disciplina_id",
        "turma_disciplina.id",
      )
      .join("turma", "turma_disciplina.turma_id", "turma.id")
      .join("curso_disciplina", "turma_disciplina.curso_disciplina_id", "curso_disciplina.id")
      .join("disciplinas", "curso_disciplina.disciplina_id", "disciplinas.id")
      .select(
        "frequencia.*",
        "aluno.id as aluno_id",
        "aluno.matricula",
        "pessoa.nome as aluno_nome",
        "turma_disciplina.id as turma_disciplina_id",
        "disciplinas.id as disciplina_id",
        "disciplinas.nome as disciplina_nome",
      );
  }
}
