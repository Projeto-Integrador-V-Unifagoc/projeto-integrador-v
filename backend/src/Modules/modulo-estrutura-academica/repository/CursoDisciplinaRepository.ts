import { db } from "../../../database/connection";
import { CursoDisciplinaCommand, CursoDisciplinaMapper } from "../models/CursoDisciplina";

export class CursoDisciplinaRepository {
    private baseQuery() {
        return db("curso_disciplina")
            .join("curso", "curso_disciplina.curso_id", "=", "curso.id")
            .join("disciplinas", "curso_disciplina.disciplina_id", "=", "disciplinas.id")
            .select(
                "curso_disciplina.*",
                "curso.id as curso_id",
                "curso.codigo as curso_codigo",
                "curso.nome as curso_nome",
                "disciplinas.id as disciplina_id",
                "disciplinas.codigo as disciplina_codigo",
                "disciplinas.nome as disciplina_nome",
                "disciplinas.pre_requisito as disciplina_pre_requisito",
                "disciplinas.carga_horaria as disciplina_carga_horaria",
                "disciplinas.ativo as disciplina_ativo"
            );
    }

    async criarCursoDisciplina(data: CursoDisciplinaCommand) {
        const [cursoDisciplina] = await db("curso_disciplina")
            .insert(data)
            .returning("*");

        return cursoDisciplina;
    }

    async listarCursoDisciplinas() {
        const rows = await this.baseQuery()
            .orderBy("curso.nome", "asc")
            .orderBy("disciplinas.nome", "asc");

        return rows.map(CursoDisciplinaMapper.toDomain);
    }

    async listarMatrizCurricularPorCursoId(cursoId: string) {
        const rows = await this.baseQuery()
            .where("curso_disciplina.curso_id", cursoId)
            .orderBy("curso_disciplina.periodo_ideal", "asc")
            .orderBy("disciplinas.nome", "asc");

        return rows.map(CursoDisciplinaMapper.toDomain);
    }

    async buscarCursoDisciplinaPorId(id: string) {
        const row = await this.baseQuery()
            .where("curso_disciplina.id", id)
            .first();

        return row ? CursoDisciplinaMapper.toDomain(row) : null;
    }

    async buscarCursoDisciplinaRegistroPorId(id: string) {
        return await db("curso_disciplina")
            .where({ id })
            .first();
    }

    async buscarCursoDisciplinaPorCursoEDisciplina(curso_id: string, disciplina_id: string) {
        return await db("curso_disciplina")
            .where({ curso_id, disciplina_id })
            .first();
    }

    async atualizarCursoDisciplina(id: string, data: Partial<CursoDisciplinaCommand>) {
        const [cursoDisciplina] = await db("curso_disciplina")
            .where({ id })
            .update({
                ...data,
                updated_at: db.fn.now()
            })
            .returning("*");

        return cursoDisciplina ?? null;
    }

    async removerCursoDisciplina(id: string) {
        return await db("curso_disciplina")
            .where({ id })
            .del();
    }
}
