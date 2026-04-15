import { db } from "../../../database/connection"
import { CursoCommand, CursoMapper } from "../models/Curso";

export class CursoRepository {
    async criarCurso(data: CursoCommand) {
        const [curso] = await db("curso")
            .insert(data)
            .returning("*");

        return curso;
    }

    async listarCursos() {
        const rows = await db("curso")
            .join("departamento", "curso.departamento_id", "=", "departamento.id")
            .join("faculdade", "departamento.faculdade_id", "=", "faculdade.id")
            .join("cidade", "faculdade.cidade_id", "=", "cidade.ibge")
            .select(
                "curso.*",
                "departamento.id as departamento_id",
                "departamento.nome as departamento_nome",
                "departamento.codigo as departamento_codigo",
                "faculdade.id as faculdade_id",
                "faculdade.nome as faculdade_nome",
                "faculdade.logradouro as logradouro",
                "faculdade.numero as numero",
                "faculdade.bairro as bairro",
                "faculdade.cep as cep",
                "cidade.id as cidade_id",
                "cidade.nome as cidade_nome",
                "cidade.uf as cidade_uf",
                "cidade.ibge as cidade_ibge"
            );

        return rows.map(CursoMapper.toDomain);
    }

    async buscarCursoPorId(id: string) {
        const row = await db("curso")
            .join("departamento", "curso.departamento_id", "=", "departamento.id")
            .join("faculdade", "departamento.faculdade_id", "=", "faculdade.id")
            .join("cidade", "faculdade.cidade_id", "=", "cidade.ibge")
            .where("curso.id", id)
            .select(
                "curso.*",
                "departamento.id as departamento_id",
                "departamento.nome as departamento_nome",
                "departamento.codigo as departamento_codigo",
                "faculdade.id as faculdade_id",
                "faculdade.nome as faculdade_nome",
                "faculdade.logradouro as logradouro",
                "faculdade.numero as numero",
                "faculdade.bairro as bairro",
                "faculdade.cep as cep",
                "cidade.id as cidade_id",
                "cidade.nome as cidade_nome",
                "cidade.uf as cidade_uf",
                "cidade.ibge as cidade_ibge"
            )
            .first();

        return row ? CursoMapper.toDomain(row) : null;
    }

    async atualizarCurso(id: string, data: Partial<CursoCommand>) {
        const [curso] = await db("curso")
            .where({ id })
            .update(data)
            .returning("*");

        return curso ?? null;
    }

    async removerCurso(id: string) {
        return await db("curso")
            .where({ id })
            .del();
    }
}
