import { db } from "../../../database/connection";
import { TurmaDisciplinaCommand, TurmaDisciplinaMapper } from "../models/TurmaDisciplina";

export class TurmaDisciplinaRepository {
    private async contarDependencias(executor: any, id: string) {
        const [matriculas, avaliacoes, aulas, notas, frequencias] = await Promise.all([
            executor("matricula_turma_disciplina").where({ turma_disciplina_id: id }).count("id as total").first(),
            executor("avaliacao").where({ turma_disciplina_id: id }).count("id as total").first(),
            executor("aula").where({ turma_disciplina_id: id }).count("id as total").first(),
            executor("nota as n")
                .join("avaliacao as a", "n.avaliacao_id", "=", "a.id")
                .where("a.turma_disciplina_id", id)
                .count("n.id as total")
                .first(),
            executor("frequencia as f")
                .join("aula as a", "f.aula_id", "=", "a.id")
                .where("a.turma_disciplina_id", id)
                .count("f.id as total")
                .first()
        ]);

        const resultado = {
            alunos: Number(matriculas?.total ?? 0),
            avaliacoes: Number(avaliacoes?.total ?? 0),
            aulas: Number(aulas?.total ?? 0),
            notas: Number(notas?.total ?? 0),
            frequencias: Number(frequencias?.total ?? 0)
        };

        return {
            ...resultado,
            lancamentos: resultado.avaliacoes + resultado.aulas + resultado.notas + resultado.frequencias,
            emUso: Object.values(resultado).some((total) => total > 0)
        };
    }

    private baseQuery() {
        return db("turma_disciplina")
            .join("turma", "turma_disciplina.turma_id", "=", "turma.id")
            .join("curso_disciplina", "turma_disciplina.curso_disciplina_id", "=", "curso_disciplina.id")
            .join("disciplinas", "curso_disciplina.disciplina_id", "=", "disciplinas.id")
            .join("professor", "turma_disciplina.professor_id", "=", "professor.id")
            .join("pessoa", "professor.pessoa_id", "=", "pessoa.id")
            .select(
                "turma_disciplina.*",
                "turma.id as turma_id",
                "turma.sigla as turma_sigla",
                "turma.descricao as turma_descricao",
                "curso_disciplina.id as curso_disciplina_id",
                "curso_disciplina.periodo_ideal as periodo_ideal",
                "curso_disciplina.obrigatoria as obrigatoria",
                "curso_disciplina.carga_horaria as curso_disciplina_carga_horaria",
                "disciplinas.id as disciplina_id",
                "disciplinas.codigo as disciplina_codigo",
                "disciplinas.nome as disciplina_nome",
                "disciplinas.pre_requisito as disciplina_pre_requisito",
                "disciplinas.carga_horaria as disciplina_carga_horaria",
                "professor.id as professor_id",
                "pessoa.nome as professor_nome"
            );
    }

    async criarTurmaDisciplina(data: TurmaDisciplinaCommand) {
        const [turmaDisciplina] = await db("turma_disciplina")
            .insert(data)
            .returning("*");

        return turmaDisciplina;
    }

    async listarTurmaDisciplinasPorTurmaId(turmaId: string) {
        const rows = await this.baseQuery()
            .where("turma_disciplina.turma_id", turmaId)
            .orderBy("disciplinas.nome", "asc");

        return rows.map(TurmaDisciplinaMapper.toDomain);
    }

    async buscarTurmaDisciplinaPorId(id: string) {
        const row = await this.baseQuery()
            .where("turma_disciplina.id", id)
            .first();

        return row ? TurmaDisciplinaMapper.toDomain(row) : null;
    }

    async buscarTurmaDisciplinaRegistroPorId(id: string) {
        return await db("turma_disciplina")
            .where({ id })
            .first();
    }

    async buscarTurmaDisciplinaPorTurmaECursoDisciplina(turma_id: string, curso_disciplina_id: string) {
        return await db("turma_disciplina")
            .where({ turma_id, curso_disciplina_id })
            .first();
    }

    async obterDependencias(id: string) {
        return await this.contarDependencias(db, id);
    }

    async removerSeSemDependencias(id: string) {
        return await db.transaction(async (trx) => {
            const oferta = await trx("turma_disciplina").where({ id }).forUpdate().first();

            if (!oferta) {
                return { removidos: 0, dependencias: null };
            }

            const dependencias = await this.contarDependencias(trx, id);

            if (dependencias.emUso) {
                return { removidos: 0, dependencias };
            }

            const removidos = await trx("turma_disciplina").where({ id }).del();
            return { removidos, dependencias };
        });
    }

    async atualizarTurmaDisciplina(id: string, data: Partial<TurmaDisciplinaCommand>) {
        const [turmaDisciplina] = await db("turma_disciplina")
            .where({ id })
            .update({
                ...data,
                updated_at: db.fn.now()
            })
            .returning("*");

        return turmaDisciplina ?? null;
    }

    async removerTurmaDisciplina(id: string) {
        return await db("turma_disciplina")
            .where({ id })
            .del();
    }
}
