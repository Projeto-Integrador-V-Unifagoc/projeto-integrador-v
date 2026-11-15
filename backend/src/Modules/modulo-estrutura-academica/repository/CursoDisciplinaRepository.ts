import { db } from "../../../database/connection";
import { CursoDisciplinaCommand, CursoDisciplinaMapper } from "../models/CursoDisciplina";

export class CursoDisciplinaRepository {
    private baseQuery() {
        return db("curso_disciplina")
            .join("curso", "curso_disciplina.curso_id", "=", "curso.id")
            .join("matriz_curricular", "curso_disciplina.matriz_curricular_id", "=", "matriz_curricular.id")
            .join("disciplinas", "curso_disciplina.disciplina_id", "=", "disciplinas.id")
            .select(
                "curso_disciplina.*",
                "curso.id as curso_id",
                "curso.codigo as curso_codigo",
                "curso.nome as curso_nome",
                "matriz_curricular.id as matriz_curricular_id",
                "matriz_curricular.codigo as matriz_codigo",
                "matriz_curricular.versao as matriz_versao",
                "matriz_curricular.status as matriz_status",
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

    async listarMatrizCurricularPorCursoId(cursoId: string, periodo?: number, matrizCurricularId?: string) {
        let query = this.baseQuery()
            .where("curso_disciplina.curso_id", cursoId)
            .orderBy("curso_disciplina.periodo_ideal", "asc")
            .orderBy("disciplinas.nome", "asc");

        if (periodo !== undefined) {
            query = query.where("curso_disciplina.periodo_ideal", periodo);
        }
        if (matrizCurricularId) {
            query = query.where("curso_disciplina.matriz_curricular_id", matrizCurricularId);
        } else {
            query = query.where("matriz_curricular.status", "VIGENTE");
        }

        const rows = await query;
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

    async buscarCursoDisciplinaPorMatrizEDisciplina(matriz_curricular_id: string, disciplina_id: string) {
        return await db("curso_disciplina")
            .where({ matriz_curricular_id, disciplina_id })
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
