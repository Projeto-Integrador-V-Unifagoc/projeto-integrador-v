import { db } from "../../../database/connection";

const STATUS_ATIVO = ["ativa", "ATIVA", "ATIVO", "MATRICULADO", "CURSANDO", "REGULAR"];

export interface TurmaDisponivel {
    id: string;
    turma_id: string;
    turma_sigla: string;
    turma_descricao: string;
    periodo_letivo: string;
    periodo_curricular: number;
    capacidade_alunos: number;
    vagas_disponiveis: number;
    disciplina_id: string;
    disciplina_nome: string;
    disciplina_codigo: string;
    carga_horaria: number;
    professor_nome: string;
    curso_id: string;
    curso_nome: string;
}

export interface MatriculaVinculo {
    id: string;
    aluno_id: string;
    turma_id: string;
    turma_disciplina_id?: string;
    matricula_turma_disciplina_id?: string;
    status: string;
}

export interface VinculoStatus {
    id: string;
    status: string;
    disciplina_nome: string;
    periodo_letivo: string;
}

export interface ConsultaStatusAluno {
    aluno_id: string;
    matricula: number;
    periodo: number | null;
    nome: string;
    cpf: string;
    curso_id: string;
    curso_nome: string;
    vinculos: VinculoStatus[];
}

export interface MatriculaDetalhada extends MatriculaVinculo {
    matricula_turma_disciplina_id: string;
    aluno_nome: string;
    aluno_matricula: number;
    disciplina_nome: string;
    periodo_letivo: string;
    curso_nome: string;
    professor_nome: string | null;
}

export class MatriculaRepository {
    async listarTurmasDisponiveis(cursoId: string, alunoId?: string): Promise<TurmaDisponivel[]> {
        const query = db("turma_disciplina as td")
            .join("turma as t", "td.turma_id", "t.id")
            .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
            .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
            .join("disciplinas as d", "cd.disciplina_id", "d.id")
            .join("professor as prof", "td.professor_id", "prof.id")
            .join("pessoa as pes", "prof.pessoa_id", "pes.id")
            .join("curso as c", "t.curso_id", "c.id")
            .leftJoin("matricula as m", function () {
                this.on("m.turma_id", "t.id").onIn("m.status", STATUS_ATIVO);
            })
            .where("t.curso_id", cursoId)
            .where("pl.ativo", true)
            .whereIn("t.status", STATUS_ATIVO)
            .whereIn("td.status", STATUS_ATIVO)
            .where("prof.ativo", true)
            .groupBy("td.id", "t.id", "pl.id", "d.id", "pes.id", "c.id", "cd.id")
            .havingRaw("t.capacidade_alunos > COUNT(DISTINCT m.id)")
            .select(
                "td.id",
                "t.id as turma_id",
                "t.sigla as turma_sigla",
                "t.descricao as turma_descricao",
                "pl.codigo as periodo_letivo",
                "t.periodo_curricular",
                "t.capacidade_alunos",
                "d.id as disciplina_id",
                "d.nome as disciplina_nome",
                "d.codigo as disciplina_codigo",
                "cd.carga_horaria",
                "pes.nome as professor_nome",
                "c.id as curso_id",
                "c.nome as curso_nome",
                db.raw("(t.capacidade_alunos - COUNT(DISTINCT m.id))::int as vagas_disponiveis"),
            )
            .orderBy(["pl.codigo", "t.sigla", "d.nome"]);

        if (alunoId) {
            query.whereNotExists(function () {
                this.select(db.raw("1"))
                    .from("matricula_turma_disciplina as existente")
                    .join("matricula as matricula_existente", "existente.matricula_id", "matricula_existente.id")
                    .whereRaw("existente.turma_disciplina_id = td.id")
                    .where("matricula_existente.aluno_id", alunoId)
                    .whereIn("existente.status", STATUS_ATIVO)
                    .whereIn("matricula_existente.status", STATUS_ATIVO);
            });
        }

        return query;
    }

    async criar(alunoId: string, turmaDisciplinaId: string): Promise<MatriculaVinculo> {
        return db.transaction(async (trx) => {
            const oferta = await trx("turma_disciplina as td")
                .join("turma as t", "td.turma_id", "t.id")
                .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
                .where("td.id", turmaDisciplinaId)
                .select("td.id", "td.status as oferta_status", "t.id as turma_id", "t.curso_id", "t.status as turma_status", "t.capacidade_alunos", "pl.ativo as periodo_ativo")
                .forUpdate()
                .first();
            if (!oferta) throw Object.assign(new Error("Turma/disciplina não encontrada."), { codigo: "NAO_ENCONTRADO" });
            if (!STATUS_ATIVO.includes(oferta.oferta_status) || !STATUS_ATIVO.includes(oferta.turma_status) || !oferta.periodo_ativo) {
                throw Object.assign(new Error("A turma/disciplina não está disponível para matrícula."), { codigo: "INDISPONIVEL" });
            }

            const aluno = await trx("aluno").where({ id: alunoId }).select("id", "curso_id").first();
            if (!aluno) throw Object.assign(new Error("Aluno não encontrado."), { codigo: "NAO_ENCONTRADO" });
            if (String(aluno.curso_id) !== String(oferta.curso_id)) {
                throw Object.assign(new Error("A turma não pertence ao curso do aluno."), { codigo: "CURSO_DIVERGENTE" });
            }

            let matricula = await trx("matricula").where({ aluno_id: alunoId, turma_id: oferta.turma_id }).forUpdate().first();
            const matriculaAtiva = matricula && STATUS_ATIVO.includes(matricula.status);
            if (!matriculaAtiva) {
                const [{ total }] = await trx("matricula").where({ turma_id: oferta.turma_id }).whereIn("status", STATUS_ATIVO).count("id as total");
                if (Number(total) >= Number(oferta.capacidade_alunos)) {
                    throw Object.assign(new Error("A turma não possui vagas disponíveis."), { codigo: "SEM_VAGAS" });
                }
            }

            if (!matricula) {
                [matricula] = await trx("matricula").insert({ aluno_id: alunoId, curso_id: oferta.curso_id, turma_id: oferta.turma_id, status: "ativa" }).returning("*");
            } else if (!matriculaAtiva) {
                [matricula] = await trx("matricula").where({ id: matricula.id }).update({ status: "ativa", updated_at: trx.fn.now() }).returning("*");
            }

            const vinculoExistente = await trx("matricula_turma_disciplina")
                .where({ matricula_id: matricula.id, turma_disciplina_id: turmaDisciplinaId })
                .forUpdate()
                .first();
            if (vinculoExistente && STATUS_ATIVO.includes(vinculoExistente.status)) {
                throw Object.assign(new Error("Aluno já está matriculado nesta turma/disciplina."), { codigo: "DUPLICADA" });
            }

            const [vinculo] = vinculoExistente
                ? await trx("matricula_turma_disciplina").where({ id: vinculoExistente.id }).update({ status: "ativa", data_vinculo: trx.fn.now(), updated_at: trx.fn.now() }).returning("*")
                : await trx("matricula_turma_disciplina").insert({ matricula_id: matricula.id, turma_disciplina_id: turmaDisciplinaId, status: "ativa" }).returning("*");

            return { id: matricula.id, aluno_id: alunoId, turma_id: oferta.turma_id, turma_disciplina_id: turmaDisciplinaId, matricula_turma_disciplina_id: vinculo.id, status: vinculo.status };
        });
    }

    listarTodas(): Promise<MatriculaDetalhada[]> {
        return this.baseDetalhada().orderBy("mtd.created_at", "desc");
    }

    listarPorAluno(alunoId: string): Promise<MatriculaDetalhada[]> {
        return this.baseDetalhada().where("m.aluno_id", alunoId).orderBy("pl.codigo", "desc");
    }

    buscarPorId(id: string): Promise<MatriculaVinculo | null> {
        return db("matricula").where({ id }).first().then((row) => row ?? null);
    }

    async cancelar(id: string): Promise<MatriculaVinculo | null> {
        return db.transaction(async (trx) => {
            const [matricula] = await trx("matricula").where({ id }).update({ status: "cancelada", updated_at: trx.fn.now() }).returning("*");
            if (!matricula) return null;
            await trx("matricula_turma_disciplina").where({ matricula_id: id }).update({ status: "cancelada", updated_at: trx.fn.now() });
            return matricula;
        });
    }

    async atualizarStatus(id: string, status: string): Promise<MatriculaVinculo | null> {
        return db.transaction(async (trx) => {
            const [matricula] = await trx("matricula").where({ id }).update({ status, updated_at: trx.fn.now() }).returning("*");
            if (!matricula) return null;
            await trx("matricula_turma_disciplina").where({ matricula_id: id }).update({ status, updated_at: trx.fn.now() });
            return matricula;
        });
    }

    async consultarStatusPorMatricula(matricula: number): Promise<ConsultaStatusAluno | null> {
        const aluno = await db("aluno as a").join("pessoa as p", "a.pessoa_id", "p.id").join("curso as c", "a.curso_id", "c.id")
            .where("a.matricula", matricula).select("a.id as aluno_id", "a.matricula", "a.periodo", "p.nome", "p.cpf", "c.id as curso_id", "c.nome as curso_nome").first();
        if (!aluno) return null;
        const vinculos = await db("matricula_turma_disciplina as mtd")
            .join("matricula as m", "mtd.matricula_id", "m.id")
            .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
            .join("turma as t", "td.turma_id", "t.id")
            .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
            .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
            .join("disciplinas as d", "cd.disciplina_id", "d.id")
            .where("m.aluno_id", aluno.aluno_id)
            .select("mtd.id", "mtd.status", "d.nome as disciplina_nome", "pl.codigo as periodo_letivo")
            .orderBy("pl.codigo", "desc");
        return { ...aluno, vinculos };
    }

    private baseDetalhada() {
        return db("matricula_turma_disciplina as mtd")
            .join("matricula as m", "mtd.matricula_id", "m.id")
            .join("aluno as a", "m.aluno_id", "a.id")
            .join("pessoa as p", "a.pessoa_id", "p.id")
            .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
            .join("turma as t", "td.turma_id", "t.id")
            .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
            .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
            .join("disciplinas as d", "cd.disciplina_id", "d.id")
            .join("curso as c", "t.curso_id", "c.id")
            .leftJoin("professor as prof", "td.professor_id", "prof.id")
            .leftJoin("pessoa as pp", "prof.pessoa_id", "pp.id")
            .select("m.id", "m.aluno_id", "m.turma_id", "td.id as turma_disciplina_id", "mtd.id as matricula_turma_disciplina_id", "mtd.status", "p.nome as aluno_nome", "a.matricula as aluno_matricula", "d.nome as disciplina_nome", "pl.codigo as periodo_letivo", "c.nome as curso_nome", "pp.nome as professor_nome");
    }
}
