import { db } from "../../../database/connection";
import { TurmaDisciplinaCommand, TurmaDisciplinaMapper } from "../models/TurmaDisciplina";

export class TurmaDisciplinaRepository {
    private baseQuery() {
        return db("turma_disciplina")
            .join("turma", "turma_disciplina.turma_id", "=", "turma.id")
            .join("curso_disciplina", "turma_disciplina.curso_disciplina_id", "=", "curso_disciplina.id")
            .join("disciplinas", "curso_disciplina.disciplina_id", "=", "disciplinas.id")
            .join("professor", "turma_disciplina.professor_id", "=", "professor.id")
            .join("pessoa", "professor.pessoa_id", "=", "pessoa.id")
            .select(
                "turma_disciplina.*",
                "turma.id as turma_id",
                "turma.sigla as turma_sigla",
                "turma.descricao as turma_descricao",
                "curso_disciplina.id as curso_disciplina_id",
                "curso_disciplina.periodo_ideal as periodo_ideal",
                "curso_disciplina.obrigatoria as obrigatoria",
                "curso_disciplina.carga_horaria as curso_disciplina_carga_horaria",
                "disciplinas.id as disciplina_id",
                "disciplinas.codigo as disciplina_codigo",
                "disciplinas.nome as disciplina_nome",
                "disciplinas.pre_requisito as disciplina_pre_requisito",
                "disciplinas.carga_horaria as disciplina_carga_horaria",
                "professor.id as professor_id",
                "pessoa.nome as professor_nome"
            );
    }

    async criarTurmaDisciplina(data: TurmaDisciplinaCommand) {
        const [turmaDisciplina] = await db("turma_disciplina")
            .insert(data)
            .returning("*");

        return turmaDisciplina;
    }

    async listarTurmaDisciplinasPorTurmaId(turmaId: string) {
        const rows = await this.baseQuery()
            .where("turma_disciplina.turma_id", turmaId)
            .orderBy("disciplinas.nome", "asc");

        return rows.map(TurmaDisciplinaMapper.toDomain);
    }

    async buscarTurmaDisciplinaPorId(id: string) {
        const row = await this.baseQuery()
            .where("turma_disciplina.id", id)
            .first();

        return row ? TurmaDisciplinaMapper.toDomain(row) : null;
    }

    async buscarTurmaDisciplinaRegistroPorId(id: string) {
        return await db("turma_disciplina")
            .where({ id })
            .first();
    }

    async buscarTurmaDisciplinaPorTurmaECursoDisciplina(turma_id: string, curso_disciplina_id: string) {
        return await db("turma_disciplina")
            .where({ turma_id, curso_disciplina_id })
            .first();
    }

    async atualizarTurmaDisciplina(id: string, data: Partial<TurmaDisciplinaCommand>) {
        const [turmaDisciplina] = await db("turma_disciplina")
            .where({ id })
            .update({
                ...data,
                updated_at: db.fn.now()
            })
            .returning("*");

        return turmaDisciplina ?? null;
    }

    async removerTurmaDisciplina(id: string) {
        return await db("turma_disciplina")
            .where({ id })
            .del();
    }
}
