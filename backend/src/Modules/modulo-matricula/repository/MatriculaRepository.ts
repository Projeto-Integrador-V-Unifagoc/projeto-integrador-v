import { Knex } from "knex";
import { db } from "../../../database/connection";

export const STATUS_MATRICULA = ["pendente", "ativa", "trancada", "cancelada", "concluida"] as const;

// Uma matrícula "em aberto" é a que ainda pode mudar de estado. Cancelada e
// concluída são finais: nenhuma automação do módulo pode sobrescrevê-las.
export const STATUS_MATRICULA_EM_ABERTO = ["pendente", "ativa", "trancada"] as const;
export const STATUS_VINCULO = ["ativa", "cancelada", "aprovada", "reprovada"] as const;

export type StatusMatricula = typeof STATUS_MATRICULA[number];

const STATUS_NAO_OCUPAM_VAGA = ["cancelada", "cancelado", "concluida", "concluido"];

export interface TurmaDisponivel {
    id: string;
    sigla: string;
    descricao: string;
    turno: string;
    periodo_curricular: number;
    capacidade_alunos: number;
    vagas_ocupadas: number;
    vagas_disponiveis: number;
    total_disciplinas: number;
    periodo_letivo_id: string;
    periodo_letivo_codigo: string;
    ano: number;
    semestre: number;
    curso_id: string;
    curso_nome: string;
}

export interface DisciplinaDaTurma {
    turma_disciplina_id: string;
    disciplina_id: string;
    disciplina_codigo: string;
    disciplina_nome: string;
    carga_horaria: number;
    obrigatoria: boolean;
    periodo_ideal: number | null;
    professor_id: string;
    professor_nome: string;
}

export interface Matricula {
    id: string;
    aluno_id: string;
    curso_id: string;
    turma_id: string;
    status: string;
    data_matricula: string;
}

export interface VinculoDetalhado {
    id: string;
    status: string;
    data_vinculo: string;
    turma_disciplina_id: string;
    disciplina_id: string;
    disciplina_codigo: string;
    disciplina_nome: string;
    carga_horaria: number;
    professor_nome: string | null;
}

export interface MatriculaDetalhada extends Matricula {
    aluno_nome: string;
    aluno_cpf: string;
    aluno_matricula: number;
    curso_nome: string;
    turma_sigla: string;
    turma_descricao: string;
    turno: string;
    periodo_curricular: number;
    periodo_letivo_codigo: string;
    ano: number;
    semestre: number;
    total_disciplinas: number;
    documentos_total: number;
    documentos_pendentes: number;
    documentos_aprovados: number;
    documentos_reprovados: number;
}

export interface ResumoDocumentos {
    total: number;
    pendentes: number;
    aprovados: number;
    reprovados: number;
}

export interface ConsultaStatusAluno {
    aluno_id: string;
    matricula: number;
    periodo: string;
    nome: string;
    cpf: string;
    curso_id: string;
    curso_nome: string;
    matriculas: (MatriculaDetalhada & { vinculos: VinculoDetalhado[] })[];
}

export class MatriculaRepository {

    async listarTurmasDisponiveis(cursoId: string): Promise<TurmaDisponivel[]> {
        const ocupadas = `(
            select count(*)::int from matricula m
            where m.turma_id = t.id and lower(m.status) not in (${STATUS_NAO_OCUPAM_VAGA.map(() => "?").join(", ")})
        )`;
        const disciplinas = `(
            select count(*)::int from turma_disciplina td
            where td.turma_id = t.id and lower(td.status) = 'ativa'
        )`;

        return db("turma as t")
            .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
            .join("curso as c", "t.curso_id", "c.id")
            .where("t.curso_id", cursoId)
            .whereRaw("lower(t.status) = 'ativa'")
            .whereRaw(`t.capacidade_alunos > ${ocupadas}`, STATUS_NAO_OCUPAM_VAGA)
            .select(
                "t.id",
                "t.sigla",
                "t.descricao",
                "t.turno",
                "t.periodo_curricular",
                "t.capacidade_alunos",
                "pl.id as periodo_letivo_id",
                "pl.codigo as periodo_letivo_codigo",
                "pl.ano",
                "pl.semestre",
                "c.id as curso_id",
                "c.nome as curso_nome",
                db.raw(`${ocupadas} as vagas_ocupadas`, STATUS_NAO_OCUPAM_VAGA),
                db.raw(`(t.capacidade_alunos - ${ocupadas}) as vagas_disponiveis`, STATUS_NAO_OCUPAM_VAGA),
                db.raw(`${disciplinas} as total_disciplinas`)
            )
            .orderBy("pl.ano", "desc")
            .orderBy("pl.semestre", "desc")
            .orderBy("t.sigla");
    }

    async listarDisciplinasDaTurma(turmaId: string): Promise<DisciplinaDaTurma[]> {
        return db("turma_disciplina as td")
            .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
            .join("disciplinas as d", "cd.disciplina_id", "d.id")
            .join("professor as p", "td.professor_id", "p.id")
            .join("pessoa as pes", "p.pessoa_id", "pes.id")
            .where("td.turma_id", turmaId)
            .whereRaw("lower(td.status) = 'ativa'")
            .select(
                "td.id as turma_disciplina_id",
                "d.id as disciplina_id",
                "d.codigo as disciplina_codigo",
                "d.nome as disciplina_nome",
                "cd.carga_horaria",
                "cd.obrigatoria",
                "cd.periodo_ideal",
                "p.id as professor_id",
                "pes.nome as professor_nome"
            )
            .orderBy("cd.periodo_ideal")
            .orderBy("d.nome");
    }

    async buscarTurma(turmaId: string, trx?: Knex.Transaction) {
        const query = (trx ?? db)("turma").where({ id: turmaId }).first();
        if (trx) query.forUpdate();
        return query;
    }

    async buscarAluno(alunoId: string, trx?: Knex.Transaction) {
        return (trx ?? db)("aluno").where({ id: alunoId }).first();
    }

    async contarOcupacaoDaTurma(turmaId: string, trx?: Knex.Transaction): Promise<number> {
        const row = await (trx ?? db)("matricula")
            .where({ turma_id: turmaId })
            .whereRaw("lower(status) not in (?, ?, ?, ?)", STATUS_NAO_OCUPAM_VAGA)
            .count("id as count")
            .first();
        return Number(row?.count ?? 0);
    }

    async buscarMatriculaAtivaDoAluno(alunoId: string, trx?: Knex.Transaction): Promise<Matricula | undefined> {
        return (trx ?? db)("matricula")
            .where({ aluno_id: alunoId })
            .whereRaw("lower(status) not in (?, ?, ?, ?)", STATUS_NAO_OCUPAM_VAGA)
            .first();
    }

    async listarTurmaDisciplinasValidas(turmaId: string, ids: string[], trx?: Knex.Transaction): Promise<{ id: string }[]> {
        return (trx ?? db)("turma_disciplina")
            .where({ turma_id: turmaId })
            .whereIn("id", ids)
            .whereRaw("lower(status) = 'ativa'")
            .select("id");
    }

    async listarIdsDisciplinasAtivasDaTurma(turmaId: string, trx?: Knex.Transaction): Promise<string[]> {
        const rows = await (trx ?? db)("turma_disciplina")
            .where({ turma_id: turmaId })
            .whereRaw("lower(status) = 'ativa'")
            .select("id");
        return rows.map((r: { id: string }) => r.id);
    }

    async criarComVinculos(
        dados: { alunoId: string; cursoId: string; turmaId: string; turmaDisciplinaIds: string[] },
        trx: Knex.Transaction
    ): Promise<{ matricula: Matricula; vinculosCriados: number }> {
        const [matricula] = await trx("matricula")
            .insert({
                aluno_id: dados.alunoId,
                curso_id: dados.cursoId,
                turma_id: dados.turmaId,
                status: "pendente",
            })
            .returning("*");

        if (dados.turmaDisciplinaIds.length > 0) {
            await trx("matricula_turma_disciplina").insert(
                dados.turmaDisciplinaIds.map((turmaDisciplinaId) => ({
                    matricula_id: matricula.id,
                    turma_disciplina_id: turmaDisciplinaId,
                    status: "ativa",
                }))
            );
        }

        return { matricula, vinculosCriados: dados.turmaDisciplinaIds.length };
    }

    async buscarPorId(id: string): Promise<Matricula | null> {
        const row = await db("matricula").where({ id }).first();
        return row ?? null;
    }

    async atualizarStatus(id: string, status: string): Promise<Matricula | null> {
        const [row] = await db("matricula")
            .where({ id })
            .update({ status, updated_at: db.fn.now() })
            .returning("*");
        return row ?? null;
    }

    async cancelarComVinculos(id: string): Promise<Matricula | null> {
        return db.transaction(async (trx) => {
            await trx("matricula_turma_disciplina")
                .where({ matricula_id: id })
                .whereRaw("lower(status) = 'ativa'")
                .update({ status: "cancelada", updated_at: trx.fn.now() });

            const [row] = await trx("matricula")
                .where({ id })
                .update({ status: "cancelada", updated_at: trx.fn.now() })
                .returning("*");

            return row ?? null;
        });
    }

    async adicionarVinculos(matriculaId: string, turmaDisciplinaIds: string[]): Promise<number> {
        const inseridos = await db("matricula_turma_disciplina")
            .insert(
                turmaDisciplinaIds.map((turmaDisciplinaId) => ({
                    matricula_id: matriculaId,
                    turma_disciplina_id: turmaDisciplinaId,
                    status: "ativa",
                }))
            )
            .onConflict(["matricula_id", "turma_disciplina_id"])
            .ignore()
            .returning("id");
        return inseridos.length;
    }

    async cancelarVinculo(vinculoId: string): Promise<VinculoDetalhado | null> {
        const [row] = await db("matricula_turma_disciplina")
            .where({ id: vinculoId })
            .update({ status: "cancelada", updated_at: db.fn.now() })
            .returning("*");
        return row ?? null;
    }

    async buscarVinculo(vinculoId: string) {
        return db("matricula_turma_disciplina").where({ id: vinculoId }).first();
    }

    private queryDetalhada() {
        return db("matricula as m")
            .join("aluno as a", "m.aluno_id", "a.id")
            .join("pessoa as pes", "a.pessoa_id", "pes.id")
            .join("curso as c", "m.curso_id", "c.id")
            .join("turma as t", "m.turma_id", "t.id")
            .join("periodo_letivo as pl", "t.periodo_letivo_id", "pl.id")
            .select(
                "m.id",
                "m.aluno_id",
                "m.curso_id",
                "m.turma_id",
                "m.status",
                "m.data_matricula",
                "pes.nome as aluno_nome",
                "pes.cpf as aluno_cpf",
                "a.matricula as aluno_matricula",
                "c.nome as curso_nome",
                "t.sigla as turma_sigla",
                "t.descricao as turma_descricao",
                "t.turno",
                "t.periodo_curricular",
                "pl.codigo as periodo_letivo_codigo",
                "pl.ano",
                "pl.semestre",
                db.raw(`(
                    select count(*)::int from matricula_turma_disciplina mtd
                    where mtd.matricula_id = m.id and lower(mtd.status) = 'ativa'
                ) as total_disciplinas`),
                db.raw(`(
                    select count(*)::int from documento doc where doc.aluno_id = m.aluno_id
                ) as documentos_total`),
                db.raw(`(
                    select count(*)::int from documento doc
                    where doc.aluno_id = m.aluno_id and upper(doc.status) = 'PENDENTE'
                ) as documentos_pendentes`),
                db.raw(`(
                    select count(*)::int from documento doc
                    where doc.aluno_id = m.aluno_id and upper(doc.status) = 'APROVADO'
                ) as documentos_aprovados`),
                db.raw(`(
                    select count(*)::int from documento doc
                    where doc.aluno_id = m.aluno_id and upper(doc.status) = 'REPROVADO'
                ) as documentos_reprovados`)
            );
    }

    async resumoDocumentosDoAluno(alunoId: string): Promise<ResumoDocumentos> {
        const linha: any = await db("documento")
            .where({ aluno_id: alunoId })
            .select(
                db.raw("count(*)::int as total"),
                db.raw("count(*) filter (where upper(status) = 'PENDENTE')::int as pendentes"),
                db.raw("count(*) filter (where upper(status) = 'APROVADO')::int as aprovados"),
                db.raw("count(*) filter (where upper(status) = 'REPROVADO')::int as reprovados")
            )
            .first();

        return {
            total: Number(linha?.total ?? 0),
            pendentes: Number(linha?.pendentes ?? 0),
            aprovados: Number(linha?.aprovados ?? 0),
            reprovados: Number(linha?.reprovados ?? 0),
        };
    }

    async listarTodas(): Promise<MatriculaDetalhada[]> {
        return this.queryDetalhada().orderBy("m.data_matricula", "desc").orderBy("pes.nome");
    }

    async listarPorAluno(alunoId: string): Promise<MatriculaDetalhada[]> {
        return this.queryDetalhada().where("m.aluno_id", alunoId).orderBy("m.data_matricula", "desc");
    }

    async listarVinculos(matriculaId: string): Promise<VinculoDetalhado[]> {
        return db("matricula_turma_disciplina as mtd")
            .join("turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
            .join("curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
            .join("disciplinas as d", "cd.disciplina_id", "d.id")
            .leftJoin("professor as p", "td.professor_id", "p.id")
            .leftJoin("pessoa as pp", "p.pessoa_id", "pp.id")
            .where("mtd.matricula_id", matriculaId)
            .select(
                "mtd.id",
                "mtd.status",
                "mtd.data_vinculo",
                "mtd.turma_disciplina_id",
                "d.id as disciplina_id",
                "d.codigo as disciplina_codigo",
                "d.nome as disciplina_nome",
                "cd.carga_horaria",
                "pp.nome as professor_nome"
            )
            .orderBy("d.nome");
    }

    async consultarPorNumeroMatricula(numeroMatricula: number): Promise<ConsultaStatusAluno | null> {
        const aluno = await db("aluno as a")
            .join("pessoa as p", "a.pessoa_id", "p.id")
            .leftJoin("curso as c", "a.curso_id", "c.id")
            .where("a.matricula", numeroMatricula)
            .select(
                "a.id as aluno_id",
                "a.matricula",
                "a.periodo",
                "p.nome",
                "p.cpf",
                "c.id as curso_id",
                "c.nome as curso_nome"
            )
            .first();

        if (!aluno) return null;

        const matriculas = await this.listarPorAluno(aluno.aluno_id);
        const comVinculos = await Promise.all(
            matriculas.map(async (matricula) => ({
                ...matricula,
                vinculos: await this.listarVinculos(matricula.id),
            }))
        );

        return { ...aluno, matriculas: comVinculos };
    }

    transacao<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
        return db.transaction(callback);
    }
}
