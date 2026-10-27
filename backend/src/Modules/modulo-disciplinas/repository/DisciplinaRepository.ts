import type { Knex } from "knex";
import { db } from "../../../database/connection";
import { DisciplinaCommand, DisciplinaCompetenciaCommand, DisciplinaMapper } from "../models/Disciplina";

type Executor = Knex | Knex.Transaction;

export class DisciplinaRepository {
    transacao<T>(callback: (trx: Knex.Transaction) => Promise<T>) {
        return db.transaction(callback);
    }

    async criarDisciplina(data: DisciplinaCommand, executor: Executor = db) {
        const [disciplina] = await executor("disciplinas")
            .insert(data)
            .returning("*");

        return disciplina;
    }

    async listarDisciplinas() {
        const rows = await db("disciplinas as d")
            .select("d.*")
            .select(db.raw("(SELECT COUNT(*)::int FROM disciplina_competencia dc WHERE dc.disciplina_id = d.id) AS quantidade_competencias"))
            .orderBy("d.nome", "asc");

        return rows.map(DisciplinaMapper.toDomain);
    }

    async buscarDisciplinaPorId(id: string, executor: Executor = db) {
        const row = await executor("disciplinas")
            .where("id", id)
            .select("*")
            .first();

        return row ? DisciplinaMapper.toDomain(row) : null;
    }

    async buscarDisciplinaPorCodigo(codigo: string, executor: Executor = db) {
        return await executor("disciplinas")
            .where({ codigo })
            .first();
    }

    async atualizarDisciplina(id: string, data: Partial<DisciplinaCommand>, executor: Executor = db) {
        const [disciplina] = await executor("disciplinas")
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

    async possuiVinculos(id: string) {
        return db("curso_disciplina").where({ disciplina_id: id }).first().then(Boolean);
    }

    async listarCompetenciasDaDisciplina(disciplinaId: string, executor: Executor = db) {
        return executor("disciplina_competencia as dc")
            .join("competencia as c", "dc.competencia_id", "c.id")
            .where("dc.disciplina_id", disciplinaId)
            .select(
                "dc.id", "dc.competencia_id", "c.codigo", "c.nome", "c.descricao", "c.tipo",
                "dc.nivel_esperado", "dc.obrigatoria", "dc.ordem",
            )
            .orderBy("dc.ordem")
            .orderBy("c.nome");
    }

    async buscarCompetenciasAtivas(ids: string[], executor: Executor = db) {
        if (!ids.length) return [];
        return executor("competencia").whereIn("id", ids).where({ ativo: true }).select("id");
    }

    async substituirCompetencias(
        disciplinaId: string,
        competencias: DisciplinaCompetenciaCommand[],
        executor: Executor,
    ) {
        await executor("disciplina_competencia").where({ disciplina_id: disciplinaId }).del();
        if (!competencias.length) return;
        await executor("disciplina_competencia").insert(competencias.map((item) => ({
            disciplina_id: disciplinaId,
            competencia_id: item.competencia_id,
            nivel_esperado: item.nivel_esperado,
            obrigatoria: item.obrigatoria,
            ordem: item.ordem,
        })));
    }
}
