import { db } from "../../../database/connection";
import { ProfessorMapper } from "../models/Professor";

export class ProfessorRepository {
    async listarProfessores() {
        const rows = await db("professor")
            .join("pessoa", "professor.pessoa_id", "=", "pessoa.id")
            .leftJoin("curso", "professor.curso_id", "=", "curso.id")
            .select(
                "professor.id",
                "pessoa.nome as nome",
                "curso.id as curso_id",
                "curso.nome as curso_nome"
            )
            .orderBy("pessoa.nome", "asc");

        return rows.map(ProfessorMapper.toDomain);
    }

    async buscarProfessorRegistroPorId(id: string) {
        return await db("professor")
            .where({ id })
            .first();
    }
}
