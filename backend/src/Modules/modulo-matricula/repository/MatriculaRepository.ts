import { db } from "../../../database/connection";

export interface TurmaDisponivel {
    id: string;
    semestre: string;
    capacidade_alunos: number;
    vagas_disponiveis: number;
    disciplina_id: string;
    disciplina_nome: string;
    disciplina_codigo: string;
    carga_horaria: number;
    professor_nome: string;
    curso_id: string;
    curso_nome: string;
}

export interface MatriculaVinculo {
    id: string;
    aluno_id: string;
    turma_id: string;
    status: string | null;
    aprovacao: boolean | null;
}

export interface MatriculaDetalhada extends MatriculaVinculo {
    aluno_nome: string;
    aluno_matricula: number;
    disciplina_nome: string;
    semestre: string;
    curso_nome: string;
    professor_nome: string | null;
}

export class MatriculaRepository {

    async listarTurmasDisponiveis(cursoId: string): Promise<TurmaDisponivel[]> {
        const rows = await db("turma as t")
            .join("disciplinas as d", "t.disciplina_id", "d.id")
            .join("professor as p", "t.professor_id", "p.id")
            .join("pessoa as pes", "p.pessoa_id", "pes.id")
            .join("curso as c", "t.curso_id", "c.id")
            .leftJoin("aluno_turma as at", "at.turma_id", "t.id")
            .where("t.curso_id", cursoId)
            .groupBy("t.id", "d.id", "pes.id", "c.id", "t.capacidade_alunos")
            .havingRaw("t.capacidade_alunos > COUNT(at.id)")
            .select(
                "t.id",
                "t.semestre",
                "t.capacidade_alunos",
                "d.id as disciplina_id",
                "d.nome as disciplina_nome",
                "d.codigo as disciplina_codigo",
                "d.carga_horaria",
                "pes.nome as professor_nome",
                "c.id as curso_id",
                "c.nome as curso_nome",
                db.raw("(t.capacidade_alunos - COUNT(at.id)) as vagas_disponiveis")
            );
        return rows;
    }

    async alunoJaMatriculado(alunoId: string, turmaId: string): Promise<boolean> {
        const result = await db("aluno_turma")
            .where({ aluno_id: alunoId, turma_id: turmaId })
            .count("id as count")
            .first();
        return Number(result?.count ?? 0) > 0;
    }

    async criar(alunoId: string, turmaId: string): Promise<MatriculaVinculo> {
        const [mat] = await db("aluno_turma")
            .insert({ aluno_id: alunoId, turma_id: turmaId, status: "MATRICULADO" })
            .returning("*");
        return mat;
    }

    async listarTodas(): Promise<MatriculaDetalhada[]> {
        return db("aluno_turma as at")
            .join("aluno as a", "at.aluno_id", "a.id")
            .join("pessoa as p", "a.pessoa_id", "p.id")
            .join("turma as t", "at.turma_id", "t.id")
            .join("disciplinas as d", "t.disciplina_id", "d.id")
            .join("curso as c", "t.curso_id", "c.id")
            .leftJoin("professor as pr", "t.professor_id", "pr.id")
            .leftJoin("pessoa as pp", "pr.pessoa_id", "pp.id")
            .select(
                "at.id",
                "at.aluno_id",
                "at.turma_id",
                "at.status",
                "at.aprovacao",
                "p.nome as aluno_nome",
                "a.matricula as aluno_matricula",
                "d.nome as disciplina_nome",
                "t.semestre",
                "c.nome as curso_nome",
                "pp.nome as professor_nome"
            )
            .orderBy("at.id", "desc");
    }

    async listarPorAluno(alunoId: string): Promise<MatriculaDetalhada[]> {
        return db("aluno_turma as at")
            .join("aluno as a", "at.aluno_id", "a.id")
            .join("pessoa as p", "a.pessoa_id", "p.id")
            .join("turma as t", "at.turma_id", "t.id")
            .join("disciplinas as d", "t.disciplina_id", "d.id")
            .join("curso as c", "t.curso_id", "c.id")
            .leftJoin("professor as pr", "t.professor_id", "pr.id")
            .leftJoin("pessoa as pp", "pr.pessoa_id", "pp.id")
            .where("at.aluno_id", alunoId)
            .select(
                "at.id",
                "at.aluno_id",
                "at.turma_id",
                "at.status",
                "at.aprovacao",
                "p.nome as aluno_nome",
                "a.matricula as aluno_matricula",
                "d.nome as disciplina_nome",
                "t.semestre",
                "c.nome as curso_nome",
                "pp.nome as professor_nome"
            );
    }

    async buscarPorId(id: string): Promise<MatriculaVinculo | null> {
        const mat = await db("aluno_turma").where({ id }).first();
        return mat ?? null;
    }

    async cancelar(id: string): Promise<MatriculaVinculo | null> {
        const [mat] = await db("aluno_turma")
            .where({ id })
            .update({ status: "CANCELADO" })
            .returning("*");
        return mat ?? null;
    }

    async atualizarStatus(id: string, status: string): Promise<MatriculaVinculo | null> {
        const [mat] = await db("aluno_turma")
            .where({ id })
            .update({ status })
            .returning("*");
        return mat ?? null;
    }
}
