import { DocumentoRepository, CriarDocumentoDTO, Documento, DocumentoComAluno, TIPOS_DOCUMENTO } from "../repository/DocumentoRepository";

const STATUS_VALIDOS = ["PENDENTE", "APROVADO", "REPROVADO"];

export class DocumentoService {
    private repository = new DocumentoRepository();

    async criar(dados: CriarDocumentoDTO): Promise<Documento> {
        if (!TIPOS_DOCUMENTO.includes(dados.tipo_documento as any)) {
            throw new Error(`Tipo inválido. Use: ${TIPOS_DOCUMENTO.join(", ")}.`);
        }
        return this.repository.criar(dados);
    }

    async listarTodos(): Promise<DocumentoComAluno[]> {
        return this.repository.listarTodos();
    }

    async listarPorAluno(alunoId: string): Promise<Documento[]> {
        return this.repository.listarPorAluno(alunoId);
    }

    async buscarPorId(id: string): Promise<Documento> {
        const doc = await this.repository.buscarPorId(id);
        if (!doc) throw new Error(`Documento ${id} não encontrado.`);
        return doc;
    }

    async validar(id: string, status: string, observacao?: string): Promise<Documento> {
        if (!STATUS_VALIDOS.includes(status)) {
            throw new Error(`Status inválido. Use: ${STATUS_VALIDOS.join(", ")}.`);
        }
        const doc = await this.repository.buscarPorId(id);
        if (!doc) throw new Error(`Documento ${id} não encontrado.`);

        const documentoAtualizado = (await this.repository.validar(id, status, observacao))!;

        if (status === "REPROVADO") {
            await this.repository.atualizarStatusMatriculaAluno(doc.aluno_id, "CANCELADO");
        } else if (status === "APROVADO") {
            const pendentes = await this.repository.contarDocumentosPendentesOuReprovados(doc.aluno_id);
            if (pendentes === 0) {
                await this.repository.atualizarStatusMatriculaAluno(doc.aluno_id, "MATRICULADO");
            }
        }

        return documentoAtualizado;
    }

    async deletar(id: string): Promise<void> {
        const doc = await this.repository.buscarPorId(id);
        if (!doc) throw new Error(`Documento ${id} não encontrado.`);
        await this.repository.deletar(id);
    }
}
