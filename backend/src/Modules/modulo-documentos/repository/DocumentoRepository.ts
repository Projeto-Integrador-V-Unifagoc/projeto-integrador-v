import { db } from "../../../database/connection";

export const TIPOS_DOCUMENTO = [
    "RG",
    "CPF",
    "HISTORICO",
    "COMPROVANTE_RESIDENCIA",
    "NOTAS_ENEM",
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
}
