import { db } from "../../../database/connection";
import { DisciplinaCommand, DisciplinaMapper } from "../models/Disciplina";
import { escritaEstrutura } from "../../modulo-estrutura-academica/gateways/EscritaEstruturaAcademica";

export class DisciplinaRepository {
    async criarDisciplina(data: DisciplinaCommand) {
        const [disciplina] = await db("disciplinas")
            .insert(data)
            .returning("*");

        return disciplina;
    }

    async listarDisciplinas() {
        const rows = await db("disciplinas")
            .select("*")
            .orderBy("nome", "asc");

        return rows.map(DisciplinaMapper.toDomain);
    }

    async buscarDisciplinaPorId(id: string) {
        const row = await db("disciplinas")
            .where("id", id)
            .select("*")
            .first();

        return row ? DisciplinaMapper.toDomain(row) : null;
    }

    async buscarDisciplinaPorCodigo(codigo: string) {
        return await db("disciplinas")
            .where({ codigo })
            .first();
    }

    async atualizarDisciplina(id: string, data: Partial<DisciplinaCommand>) {
        return escritaEstrutura(db, "disciplinas", id, data, async (trx) => {
        const [disciplina] = await trx("disciplinas")
            .where({ id })
            .update(data)
            .returning("*");

        return disciplina ?? null;
        });
    }

    async removerDisciplina(id: string) {
        return escritaEstrutura(db, "disciplinas", id, {}, async (trx) => trx("disciplinas")
            .where({ id })
            .del(), true);
    }
}
