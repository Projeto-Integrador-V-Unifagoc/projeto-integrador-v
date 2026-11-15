import { db } from "../../../database/connection";
import { TurmaCommand, TurmaMapper } from "../models/Turma";

export class TurmaRepository {
    private baseQuery() {
        return db("turma")
            .join("periodo_letivo", "turma.periodo_letivo_id", "=", "periodo_letivo.id")
            .join("curso", "turma.curso_id", "=", "curso.id")
            .join("matriz_curricular", "turma.matriz_curricular_id", "=", "matriz_curricular.id")
            .select(
                "turma.*",
                "periodo_letivo.id as periodo_letivo_id",
                "periodo_letivo.codigo as periodo_letivo_codigo",
                "periodo_letivo.ano as periodo_letivo_ano",
                "periodo_letivo.semestre as periodo_letivo_semestre",
                "periodo_letivo.data_inicio as periodo_letivo_data_inicio",
                "periodo_letivo.data_fim as periodo_letivo_data_fim",
                "curso.id as curso_id",
                "curso.codigo as curso_codigo",
                "curso.nome as curso_nome",
                "matriz_curricular.id as matriz_curricular_id",
                "matriz_curricular.codigo as matriz_codigo",
                "matriz_curricular.versao as matriz_versao",
                "matriz_curricular.status as matriz_status"
            );
    }

    async criarTurma(data: TurmaCommand) {
        const [turma] = await db("turma")
            .insert(data)
            .returning("*");

        return turma;
    }

    async listarTurmas() {
        const rows = await this.baseQuery()
            .orderBy("periodo_letivo.ano", "desc")
            .orderBy("periodo_letivo.semestre", "desc")
            .orderBy("turma.sigla", "asc");

        return rows.map(TurmaMapper.toDomain);
    }

    async buscarTurmaPorId(id: string) {
        const row = await this.baseQuery()
            .where("turma.id", id)
            .first();

        return row ? TurmaMapper.toDomain(row) : null;
    }

    async buscarTurmaRegistroPorId(id: string) {
        return await db("turma")
            .where({ id })
            .first();
    }

    async buscarTurmaPorChave(periodo_letivo_id: string, curso_id: string, sigla: string) {
        return await db("turma")
            .where({ periodo_letivo_id, curso_id, sigla })
            .first();
    }

    async atualizarTurma(id: string, data: Partial<TurmaCommand>) {
        const [turma] = await db("turma")
            .where({ id })
            .update({
                ...data,
                updated_at: db.fn.now()
            })
            .returning("*");

        return turma ?? null;
    }

    async removerTurma(id: string) {
        return await db("turma")
            .where({ id })
            .del();
    }
}
