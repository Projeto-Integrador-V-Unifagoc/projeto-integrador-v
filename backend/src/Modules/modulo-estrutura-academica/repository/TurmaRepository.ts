import { db } from "../../../database/connection";
import { TurmaCommand, TurmaMapper } from "../models/Turma";
import { escritaEstrutura, ValidacaoEstrutura } from "../gateways/EscritaEstruturaAcademica";

export class TurmaRepository {
    private baseQuery() {
        return db("turma")
            .join("periodo_letivo", "turma.periodo_letivo_id", "=", "periodo_letivo.id")
            .join("curso", "turma.curso_id", "=", "curso.id")
            .select(
                "turma.*",
                "periodo_letivo.id as periodo_letivo_id",
                "periodo_letivo.codigo as periodo_letivo_codigo",
                "periodo_letivo.ano as periodo_letivo_ano",
                "periodo_letivo.semestre as periodo_letivo_semestre",
                "curso.id as curso_id",
                "curso.codigo as curso_codigo",
                "curso.nome as curso_nome"
            );
    }

    async criarTurma(data: TurmaCommand) {
        return escritaEstrutura(db, "turma", data.id, data, async (trx) => {
        const curso = await trx("piv.curso").where({ id: data.curso_id }).first();
        const periodo = await trx("piv.periodo_letivo").where({ id: data.periodo_letivo_id }).first();
        if (!curso || !periodo) throw new ValidacaoEstrutura("Os vínculos da turma não estão disponíveis.");
        const [turma] = await trx("turma")
            .insert(data)
            .returning("*");

        return turma;
        });
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
        return escritaEstrutura(db, "turma", id, data, async (trx) => {
        const [turma] = await trx("turma")
            .where({ id })
            .update({
                ...data,
                updated_at: trx.fn.now()
            })
            .returning("*");

        return turma ?? null;
        });
    }

    async removerTurma(id: string) {
        return escritaEstrutura(db, "turma", id, {}, async (trx) => trx("turma")
            .where({ id })
            .del(), true);
    }
}
