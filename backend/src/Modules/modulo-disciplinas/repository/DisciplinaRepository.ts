import { db } from "../../../database/connection";
import { DisciplinaCommand, DisciplinaMapper } from "../models/Disciplina";

export class DisciplinaRepository {
    async criarDisciplina(data: DisciplinaCommand) {
        const [disciplina] = await db("disciplinas")
            .insert(data)
            .returning("*");

        return disciplina;
    }

    async listarDisciplinas() {
        const rows = await db("disciplinas")
            .join("curso", "disciplinas.curso_id", "=", "curso.id")
            .select(
                "disciplinas.id",
                "disciplinas.codigo",
                "disciplinas.nome",
                "disciplinas.pre_requisito",
                "disciplinas.carga_horaria",
                "curso.id as curso_id",
                "curso.codigo as curso_codigo",
                "curso.nome as curso_nome"
            );

        return rows.map(DisciplinaMapper.toDomain);
    }

    async buscarDisciplinaPorId(id: string) {
        const row = await db("disciplinas")
            .join("curso", "disciplinas.curso_id", "=", "curso.id")
            .where("disciplinas.id", id)
            .select(
                "disciplinas.id",
                "disciplinas.codigo",
                "disciplinas.nome",
                "disciplinas.pre_requisito",
                "disciplinas.carga_horaria",
                "curso.id as curso_id",
                "curso.codigo as curso_codigo",
                "curso.nome as curso_nome"
            )
            .first();

        return row ? DisciplinaMapper.toDomain(row) : null;
    }

    async atualizarDisciplina(id: string, data: Partial<DisciplinaCommand>) {
        const [disciplina] = await db("disciplinas")
            .where({ id })
            .update(data)
            .returning("*");

        return disciplina ?? null;
    }

    async removerDisciplina(id: string) {
        return await db("disciplinas")
            .where({ id })
            .del();
    }
}
