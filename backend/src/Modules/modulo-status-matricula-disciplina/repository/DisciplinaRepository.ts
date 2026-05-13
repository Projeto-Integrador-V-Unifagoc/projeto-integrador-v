import { db } from "../../../database/connection";
import { DisciplinaMapper, StatusMatriculaDisciplinaCommand } from "../model/Disciplina";

export class DisciplinaRepository {
    async criarStatusMatriculaDisciplina(data: StatusMatriculaDisciplinaCommand) {
        const status = await db("status_disciplina")
            .insert(data)
            .returning("*");

        return status[0];
    }

    async listarStatusMatriculaDisciplina() {
        const rows = await db("status_disciplina")
            .select("*")
            .orderBy("nome", "asc");

        return rows.map(DisciplinaMapper.toDomain);
    }

    async buscarStatusMatriculaDisciplinaPorId(id: string) {
        const row = await db("status_disciplina")
            .where("id", id)
            .first();

        return row ? DisciplinaMapper.toDomain(row) : null;
    }
}
