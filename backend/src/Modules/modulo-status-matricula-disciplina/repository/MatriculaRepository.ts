import { db } from "../../../database/connection";
import { MatriculaMapper, StatusMatriculaCursoCommand } from "../model/Matricula";

export class MatriculaRepository {
    async criarStatusMatriculaCurso(data: StatusMatriculaCursoCommand) {
        const status = await db("status_matricula")
            .insert(data)
            .returning("*");

        return status[0];
    }

    async listarStatusMatriculaCurso() {
        const rows = await db("status_matricula")
            .select("*")
            .orderBy("descricao", "asc");

        return rows.map(MatriculaMapper.toDomain);
    }

    async buscarStatusMatriculaCursoPorId(id: string) {
        const row = await db("status_matricula")
            .where("id", id)
            .first();

        return row ? MatriculaMapper.toDomain(row) : null;
    }
}
