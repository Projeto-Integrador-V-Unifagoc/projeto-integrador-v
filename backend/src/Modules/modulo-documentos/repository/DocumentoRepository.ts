import { db } from "../../../database/connection";

export const TIPOS_DOCUMENTO = [
    "RG",
    "CPF",
    "HISTORICO",
    "COMPROVANTE_RESIDENCIA",
    "NOTAS_ENEM",
    "COMPROVANTE_INSCRICAO_ENEM",
    "OUTROS",
] as const;

export type TipoDocumento = typeof TIPOS_DOCUMENTO[number];

export interface Documento {
    id: string;
    aluno_id: string;
    tipo_documento: string;
    nome_arquivo: string;
    caminho_arquivo: string;
    status: string;
    observacao: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface DocumentoComAluno extends Documento {
    aluno_nome: string;
    aluno_matricula: number;
    aluno_cpf: string;
}

export interface InscritoComDocumentos {
    aluno_id: string;
    aluno_nome: string;
    aluno_cpf: string;
    aluno_matricula: number;
    curso_nome: string | null;
    documentos_total: number;
    documentos_pendentes: number;
    documentos_aprovados: number;
    documentos_reprovados: number;
    ultimo_envio: Date | null;
    tem_matricula: boolean;
}

export interface CriarDocumentoDTO {
    aluno_id: string;
    tipo_documento: string;
    nome_arquivo: string;
    caminho_arquivo: string;
}

export class DocumentoRepository {
    async criar(dados: CriarDocumentoDTO): Promise<Documento> {
        const [doc] = await db("documento").insert(dados).returning("*");
        return doc;
    }

    async listarTodos(): Promise<DocumentoComAluno[]> {
        return db("documento as doc")
            .join("aluno as a", "doc.aluno_id", "a.id")
            .join("pessoa as p", "a.pessoa_id", "p.id")
            .select(
                "doc.*",
                "p.nome as aluno_nome",
                "a.matricula as aluno_matricula",
                "p.cpf as aluno_cpf"
            )
            .orderBy("doc.created_at", "desc");
    }

    async listarPorAluno(alunoId: string): Promise<Documento[]> {
        return db("documento")
            .where({ aluno_id: alunoId })
            .orderBy("created_at", "desc");
    }

    async buscarPorId(id: string): Promise<Documento | null> {
        const doc = await db("documento").where({ id }).first();
        return doc ?? null;
    }

    async validar(id: string, status: string, observacao?: string): Promise<Documento | null> {
        const [doc] = await db("documento")
            .where({ id })
            .update({ status, observacao: observacao ?? null, updated_at: db.fn.now() })
            .returning("*");
        return doc ?? null;
    }

    async deletar(id: string): Promise<boolean> {
        const count = await db("documento").where({ id }).delete();
        return count > 0;
    }

    async contarDocumentosPendentesOuReprovados(alunoId: string): Promise<number> {
        const result = await db("documento")
            .where({ aluno_id: alunoId })
            .whereIn("status", ["PENDENTE", "REPROVADO"])
            .count("id as count")
            .first();
        return Number(result?.count ?? 0);
    }

    async listarInscritos(): Promise<InscritoComDocumentos[]> {
        const linhas = await db("aluno as a")
            .join("pessoa as p", "a.pessoa_id", "p.id")
            .leftJoin("curso as c", "a.curso_id", "c.id")
            .leftJoin("documento as doc", "doc.aluno_id", "a.id")
            .groupBy("a.id", "p.nome", "p.cpf", "a.matricula", "c.nome")
            .havingRaw("count(doc.id) > 0")
            .select(
                "a.id as aluno_id",
                "p.nome as aluno_nome",
                "p.cpf as aluno_cpf",
                "a.matricula as aluno_matricula",
                "c.nome as curso_nome",
                db.raw("count(doc.id)::int as documentos_total"),
                db.raw("count(*) filter (where upper(doc.status) = 'PENDENTE')::int as documentos_pendentes"),
                db.raw("count(*) filter (where upper(doc.status) = 'APROVADO')::int as documentos_aprovados"),
                db.raw("count(*) filter (where upper(doc.status) = 'REPROVADO')::int as documentos_reprovados"),
                db.raw("max(doc.created_at) as ultimo_envio"),
                db.raw("exists(select 1 from matricula m where m.aluno_id = a.id)::boolean as tem_matricula")
            )
            .orderBy("p.nome");

        return linhas.map((linha: any) => ({
            ...linha,
            documentos_total: Number(linha.documentos_total ?? 0),
            documentos_pendentes: Number(linha.documentos_pendentes ?? 0),
            documentos_aprovados: Number(linha.documentos_aprovados ?? 0),
            documentos_reprovados: Number(linha.documentos_reprovados ?? 0),
            tem_matricula: Boolean(linha.tem_matricula),
        }));
    }
}
