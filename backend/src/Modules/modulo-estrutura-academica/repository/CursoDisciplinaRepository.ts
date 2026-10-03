import { db } from "../../../database/connection";
import { CursoDisciplinaCommand, CursoDisciplinaMapper } from "../models/CursoDisciplina";
import { escritaEstrutura, ValidacaoEstrutura } from "../gateways/EscritaEstruturaAcademica";

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
        return escritaEstrutura(db, "curso_disciplina", data.id, data, async (trx) => {
        const curso = await trx("piv.curso").where({ id: data.curso_id }).first();
        const disciplina = await trx("piv.disciplinas").where({ id: data.disciplina_id }).first();
        if (!curso || !disciplina) throw new ValidacaoEstrutura("Os vínculos da matriz não estão disponíveis.");
        const [cursoDisciplina] = await trx("curso_disciplina")
            .insert(data)
            .returning("*");

        return cursoDisciplina;
        });
    }

    async listarCursoDisciplinas() {
        const rows = await this.baseQuery()
            .orderBy("curso.nome", "asc")
            .orderBy("disciplinas.nome", "asc");

        return rows.map(CursoDisciplinaMapper.toDomain);
    }

    async listarMatrizCurricularPorCursoId(cursoId: string, periodo?: number) {
        let query = this.baseQuery()
            .where("curso_disciplina.curso_id", cursoId)
            .orderBy("curso_disciplina.periodo_ideal", "asc")
            .orderBy("disciplinas.nome", "asc");

        if (periodo !== undefined) {
            query = query.where("curso_disciplina.periodo_ideal", periodo);
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

    async buscarCursoDisciplinaPorCursoEDisciplina(curso_id: string, disciplina_id: string) {
        return await db("curso_disciplina")
            .where({ curso_id, disciplina_id })
            .first();
    }

    async atualizarCursoDisciplina(id: string, data: Partial<CursoDisciplinaCommand>) {
        return escritaEstrutura(db, "curso_disciplina", id, data, async (trx) => {
        const [cursoDisciplina] = await trx("curso_disciplina")
            .where({ id })
            .update({
                ...data,
                updated_at: trx.fn.now()
            })
            .returning("*");

        return cursoDisciplina ?? null;
        });
    }

    async removerCursoDisciplina(id: string) {
        return escritaEstrutura(db, "curso_disciplina", id, {}, async (trx) => trx("curso_disciplina")
            .where({ id })
            .del(), true);
    }
}
