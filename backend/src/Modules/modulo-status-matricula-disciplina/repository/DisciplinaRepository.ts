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
            .orderBy("descricao", "asc");

        return rows.map(DisciplinaMapper.toDomain);
    }

    async buscarStatusMatriculaDisciplinaPorId(id: string) {
        const row = await db("status_disciplina")
            .where("id", id)
            .first();

        return row ? DisciplinaMapper.toDomain(row) : null;
    }

    async atualizarStatusMatriculaDisciplina(id: string, data: { descricao: string }) {
        const rows = await db("status_disciplina")
            .where("id", id)
            .update({ descricao: data.descricao })
            .returning("*");

        return rows[0] ? DisciplinaMapper.toDomain(rows[0]) : null;
    }
}
