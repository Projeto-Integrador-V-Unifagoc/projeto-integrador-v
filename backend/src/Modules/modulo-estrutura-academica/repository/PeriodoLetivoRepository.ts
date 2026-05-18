import { db } from "../../../database/connection";
import { PeriodoLetivoCommand, PeriodoLetivoMapper } from "../models/PeriodoLetivo";

export class PeriodoLetivoRepository {
    async criarPeriodoLetivo(data: PeriodoLetivoCommand) {
        const [periodoLetivo] = await db("periodo_letivo")
            .insert(data)
            .returning("*");

        return periodoLetivo;
    }

    async listarPeriodosLetivos() {
        const rows = await db("periodo_letivo")
            .select("*")
            .orderBy("ano", "desc")
            .orderBy("semestre", "desc");

        return rows.map(PeriodoLetivoMapper.toDomain);
    }

    async buscarPeriodoLetivoPorId(id: string) {
        const row = await db("periodo_letivo")
            .where({ id })
            .first();

        return row ? PeriodoLetivoMapper.toDomain(row) : null;
    }

    async buscarPeriodoLetivoRegistroPorId(id: string) {
        return await db("periodo_letivo")
            .where({ id })
            .first();
    }

    async buscarPeriodoLetivoPorCodigo(codigo: string) {
        return await db("periodo_letivo")
            .where({ codigo })
            .first();
    }

    async buscarPeriodoLetivoPorAnoSemestre(ano: number, semestre: number) {
        return await db("periodo_letivo")
            .where({ ano, semestre })
            .first();
    }

    async atualizarPeriodoLetivo(id: string, data: Partial<PeriodoLetivoCommand>) {
        const [periodoLetivo] = await db("periodo_letivo")
            .where({ id })
            .update({
                ...data,
                updated_at: db.fn.now()
            })
            .returning("*");

        return periodoLetivo ?? null;
    }

    async removerPeriodoLetivo(id: string) {
        return await db("periodo_letivo")
            .where({ id })
            .del();
    }
}
