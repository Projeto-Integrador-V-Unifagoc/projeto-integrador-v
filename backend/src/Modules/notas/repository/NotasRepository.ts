import { db } from "../../../database/connection.js";
import { AtualizarNotaDTO, LancarNotaDTO, NotaDetalhada, NotaMapper } from "../models/NotasModels.js";

export class NotasRepository {
  private baseQuery() {
    return db("avaliacao")
      .join(
        "matricula_turma_disciplina",
        "avaliacao.matricula_turma_disciplina_id",
        "matricula_turma_disciplina.id",
      )
      .join("matricula", "matricula_turma_disciplina.matricula_id", "matricula.id")
      .join("aluno", "matricula.aluno_id", "aluno.id")
      .join("pessoa as aluno_pessoa", "aluno.pessoa_id", "aluno_pessoa.id")
      .join("turma_disciplina", "avaliacao.turma_disciplina_id", "turma_disciplina.id")
      .join("turma", "turma_disciplina.turma_id", "turma.id")
      .join("periodo_letivo", "turma.periodo_letivo_id", "periodo_letivo.id")
      .join("curso_disciplina", "turma_disciplina.curso_disciplina_id", "curso_disciplina.id")
      .join("disciplinas", "curso_disciplina.disciplina_id", "disciplinas.id")
      .join("professor", "turma_disciplina.professor_id", "professor.id")
      .join("pessoa as professor_pessoa", "professor.pessoa_id", "professor_pessoa.id")
      .select(
        "avaliacao.*",
        "matricula.id as matricula_id",
        "aluno.id as aluno_id",
        "aluno.matricula as aluno_matricula",
        "aluno_pessoa.nome as aluno_nome",
        "turma.id as turma_id",
        "turma.sigla as turma_sigla",
        "turma.descricao as turma_descricao",
        "disciplinas.id as disciplina_id",
        "disciplinas.codigo as disciplina_codigo",
        "disciplinas.nome as disciplina_nome",
        "professor.id as professor_id",
        "professor_pessoa.nome as professor_nome",
        "periodo_letivo.id as periodo_letivo_id",
        "periodo_letivo.codigo as periodo_letivo_codigo",
      );
  }

  async listar(): Promise<NotaDetalhada[]> {
    const rows = await this.baseQuery()
      .orderBy("aluno_pessoa.nome", "asc")
      .orderBy("disciplinas.nome", "asc")
      .orderBy("avaliacao.data_lancamento", "asc");

    return rows.map(NotaMapper.toDomain);
  }

  async buscarPorId(id: string): Promise<NotaDetalhada | null> {
    const row = await this.baseQuery().where("avaliacao.id", id).first();
    return row ? NotaMapper.toDomain(row) : null;
  }

  async listarPorAluno(alunoId: string): Promise<NotaDetalhada[]> {
    const rows = await this.baseQuery()
      .where("aluno.id", alunoId)
      .orderBy("disciplinas.nome", "asc")
      .orderBy("avaliacao.data_lancamento", "asc");

    return rows.map(NotaMapper.toDomain);
  }

  async listarPorTurma(turmaId: string): Promise<NotaDetalhada[]> {
    const rows = await this.baseQuery()
      .where("turma.id", turmaId)
      .orderBy("disciplinas.nome", "asc")
      .orderBy("aluno_pessoa.nome", "asc");

    return rows.map(NotaMapper.toDomain);
  }

  async listarPorTurmaDisciplina(turmaDisciplinaId: string): Promise<NotaDetalhada[]> {
    const rows = await this.baseQuery()
      .where("avaliacao.turma_disciplina_id", turmaDisciplinaId)
      .orderBy("aluno_pessoa.nome", "asc")
      .orderBy("avaliacao.data_lancamento", "asc");

    return rows.map(NotaMapper.toDomain);
  }

  async buscarVinculoMatriculaDisciplina(
    turmaDisciplinaId: string,
    alunoId: string,
  ): Promise<any | null> {
    const vinculo = await db("matricula_turma_disciplina")
      .join("matricula", "matricula_turma_disciplina.matricula_id", "matricula.id")
      .where("matricula_turma_disciplina.turma_disciplina_id", turmaDisciplinaId)
      .where("matricula.aluno_id", alunoId)
      .whereIn("matricula.status", ["ativa", "MATRICULADO", "CURSANDO", "ATIVO"])
      .whereIn("matricula_turma_disciplina.status", ["ativa", "MATRICULADO", "CURSANDO", "ATIVO"])
      .select("matricula_turma_disciplina.*")
      .first();

    return vinculo ?? null;
  }

  async buscarVinculoPorId(id: string): Promise<any | null> {
    const vinculo = await db("matricula_turma_disciplina")
      .join("matricula", "matricula_turma_disciplina.matricula_id", "matricula.id")
      .where("matricula_turma_disciplina.id", id)
      .select(
        "matricula_turma_disciplina.*",
        "matricula.aluno_id",
        "matricula.turma_id as matricula_turma_id",
      )
      .first();

    return vinculo ?? null;
  }

  async turmaDisciplinaExiste(id: string): Promise<boolean> {
    const row = await db("turma_disciplina").where({ id }).first();
    return Boolean(row);
  }

  async criar(data: LancarNotaDTO): Promise<NotaDetalhada> {
    const [nota] = await db("avaliacao")
      .insert({
        tipo_avaliacao: data.tipo_avaliacao,
        descricao_avaliacao: data.descricao_avaliacao ?? null,
        data_lancamento: data.data_lancamento ?? db.fn.now(),
        valor: data.valor,
        nota: data.nota,
        data_devolucao: data.data_devolucao ?? null,
        turma_disciplina_id: data.turma_disciplina_id,
        matricula_turma_disciplina_id: data.matricula_turma_disciplina_id,
      })
      .returning("*");

    return (await this.buscarPorId(nota.id))!;
  }

  async atualizar(id: string, data: AtualizarNotaDTO): Promise<NotaDetalhada | null> {
    const [nota] = await db("avaliacao")
      .where({ id })
      .update({
        tipo_avaliacao: data.tipo_avaliacao,
        descricao_avaliacao: data.descricao_avaliacao,
        data_lancamento: data.data_lancamento,
        valor: data.valor,
        nota: data.nota,
        data_devolucao: data.data_devolucao,
        turma_disciplina_id: data.turma_disciplina_id,
        matricula_turma_disciplina_id: data.matricula_turma_disciplina_id,
      })
      .returning("*");

    return nota ? this.buscarPorId(nota.id) : null;
  }

  async remover(id: string): Promise<number> {
    return db("avaliacao").where({ id }).del();
  }
}
